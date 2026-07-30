import test from 'ava';
import { DefaultEntitiesVectorAdapter } from '../adapters/default.js';

function create_item(key, embed_input, params = {}) {
  return {
    key,
    collection_key: params.collection_key || 'smart_sources',
    read_hash: `hash-${key}`,
    tokens: 0,
    get_embed_input_calls: 0,
    async get_embed_input() {
      this.get_embed_input_calls += 1;
      this._embed_input = embed_input;
      return this._embed_input;
    },
  };
}

function create_collection(items, params = {}) {
  const emitted_events = [];
  const collection = {
    collection_key: 'smart_sources',
    embed_model_key: 'test-model',
    embed_model: {
      is_loaded: true,
      batch_size: params.batch_size || 1,
      adapter: {
        batch_window_size: params.batch_window_size || params.batch_size || 1,
        batch_sort_by_input_length: params.sort_by_input_length === true,
      },
    },
    embed_queue: items,
    env: {
      events: {
        emit(event_key, event) {
          emitted_events.push({ event_key, event });
        },
      },
    },
    emit_event(event_key, event) {
      emitted_events.push({ event_key, event });
    },
    async process_save_queue() {},
  };
  return { collection, emitted_events };
}

test('process_embed_queue batches stable input lengths inside bounded windows', async (t) => {
  const lengths = [8, 1, 4, 2, 7, 3, 6, 5];
  const items = lengths.map((length, item_i) => {
    return create_item(`item-${item_i}`, 'x'.repeat(length));
  });
  const { collection } = create_collection(items, {
    batch_size: 2,
    batch_window_size: 4,
    sort_by_input_length: true,
  });
  const adapter = new DefaultEntitiesVectorAdapter(collection);
  const batches = [];
  const original_log = console.log;
  console.log = () => {};

  adapter.embed_batch = async (batch) => {
    batches.push(batch.map((item) => item.key));
    return batch.map(() => ({}));
  };

  try {
    await adapter.process_embed_queue();
  } finally {
    console.log = original_log;
  }

  t.deepEqual(batches, [
    ['item-1', 'item-3'],
    ['item-2', 'item-0'],
    ['item-5', 'item-7'],
    ['item-6', 'item-4'],
  ]);
  items.forEach((item) => t.is(item.get_embed_input_calls, 1));
});

test('process_embed_queue reports successful characters once and on progress', async (t) => {
  const items = [
    create_item('ascii', 'abc'),
    create_item('unicode', 'é'),
    create_item('skipped', '😀'),
  ];
  const { collection, emitted_events } = create_collection(items, {
    batch_size: 3,
    batch_window_size: 3,
  });
  const adapter = new DefaultEntitiesVectorAdapter(collection);
  const log_calls = [];
  const original_log = console.log;
  console.log = (...args) => log_calls.push(args);

  adapter.embed_batch = async () => [{}, {}, { skipped: true }];

  try {
    await adapter.process_embed_queue();
  } finally {
    console.log = original_log;
  }

  t.is(adapter.total_characters, 4);
  t.is(log_calls.length, 1);
  t.regex(log_calls[0][0], /^4 characters embedded in \d+ms$/);

  const progress_event = emitted_events
    .filter(({ event_key }) => event_key === 'embedding:progress')
    .at(-1)
  ;
  t.truthy(progress_event);
  t.is(progress_event.event.characters_embedded, 4);
  t.true(Number.isInteger(progress_event.event.elapsed_ms));
  t.true(progress_event.event.elapsed_ms >= 0);
});

test('process_embed_queue preserves processed keys and reports changed vectors separately', async (t) => {
  const items = [
    create_item('changed', 'one'),
    create_item('skipped', 'two'),
    create_item('restored', 'three'),
  ];
  const { collection, emitted_events } = create_collection(items, {
    batch_size: 3,
    batch_window_size: 3,
  });
  const adapter = new DefaultEntitiesVectorAdapter(collection);
  const original_log = console.log;
  console.log = () => {};

  adapter.embed_batch = async () => [
    {},
    { skipped: true },
    { skipped: true, vector_changed: true },
  ];

  try {
    await adapter.process_embed_queue();
  } finally {
    console.log = original_log;
  }

  const embedded_event = emitted_events.find(({ event_key }) => {
    return event_key === 'items:embedded';
  });

  t.truthy(embedded_event);
  t.deepEqual(embedded_event.event.keys, ['changed', 'skipped', 'restored']);
  t.deepEqual(embedded_event.event.changed_keys, ['changed', 'restored']);
});

test('process_embed_queue reports partial characters once and on progress when paused', async (t) => {
  const items = [
    create_item('first', 'one'),
    create_item('second', 'two'),
  ];
  const { collection, emitted_events } = create_collection(items, {
    batch_size: 1,
    batch_window_size: 1,
  });
  const adapter = new DefaultEntitiesVectorAdapter(collection);
  const log_calls = [];
  const original_log = console.log;
  console.log = (...args) => log_calls.push(args);
  let batch_count = 0;

  adapter.embed_batch = async () => {
    batch_count += 1;
    if (batch_count === 1) adapter.halt_embed_queue_processing('test pause');
    return [{}];
  };

  try {
    await adapter.process_embed_queue();
  } finally {
    console.log = original_log;
  }

  t.is(batch_count, 1);
  t.is(adapter.total_characters, 3);
  t.is(log_calls.length, 1);
  t.regex(log_calls[0][0], /^3 characters embedded in \d+ms$/);
  t.true(adapter.is_embed_queue_paused());

  const progress_event = emitted_events
    .filter(({ event_key }) => event_key === 'embedding:progress')
    .at(-1)
  ;
  t.truthy(progress_event);
  t.is(progress_event.event.characters_embedded, 3);
  t.true(progress_event.event.paused);
});

test('process_embed_queue reports model tokens and estimates missing tokens on progress', async (t) => {
  const items = [
    create_item('reported', 'x'.repeat(16)),
    create_item('zero-token-count', 'x'.repeat(20)),
    create_item('null-token-count', 'x'.repeat(8)),
    create_item('missing-token-count', 'x'.repeat(4)),
    create_item('skipped', 'x'.repeat(40)),
  ];
  const { collection, emitted_events } = create_collection(items, {
    batch_size: 5,
    batch_window_size: 5,
  });
  const adapter = new DefaultEntitiesVectorAdapter(collection);
  const original_log = console.log;
  const original_now = Date.now;
  let now = 0;
  console.log = () => {};
  Date.now = () => now;

  adapter.embed_batch = async () => {
    now = 1000;
    return [
      { tokens: 3 },
      { tokens: 0 },
      { tokens: null },
      {},
      { skipped: true, tokens: 99 },
    ];
  };

  try {
    await adapter.process_embed_queue();
  } finally {
    console.log = original_log;
    Date.now = original_now;
  }

  t.is(adapter.total_tokens, 6);
  t.is(adapter.total_characters, 48);

  const progress_event = emitted_events
    .filter(({ event_key }) => event_key === 'embedding:progress')
    .at(-1)
  ;
  t.truthy(progress_event);
  t.is(progress_event.event.tokens_per_second, 6);
  t.is(progress_event.event.characters_embedded, 48);
});

test('process_embed_queue forwards multi-item smart_blocks batches', async (t) => {
  const items = Array.from({ length: 32 }, (_, item_i) => {
    return create_item(`Notes/Test.md#Block-${item_i}`, 'embed input', {
      collection_key: 'smart_blocks',
    });
  });
  const { collection } = create_collection(items, {
    batch_size: 16,
    batch_window_size: 16,
  });
  const adapter = new DefaultEntitiesVectorAdapter(collection);
  const batch_lengths = [];
  const original_log = console.log;
  console.log = () => {};

  adapter.embed_batch = async (batch) => {
    batch_lengths.push(batch.length);
    return batch.map(() => ({}));
  };

  try {
    await adapter.process_embed_queue();
  } finally {
    console.log = original_log;
  }

  t.deepEqual(batch_lengths, [16, 16]);
  t.is(adapter.embedded_total, 32);
});
