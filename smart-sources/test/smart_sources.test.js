import test from 'ava';
import { SmartSources } from '../smart_sources.js';

test('update_links_map replaces only one source contribution', t => {
  const source = {
    key: 'Bases/Projects.base',
    outlinks: [
      {
        key: 'Projects/Current.md',
        section: 'Current section',
      },
    ],
  };
  const previous_outlinks = [
    {
      key: 'Projects/Missing.md',
    },
    {
      key: 'Projects/Removed.md',
    },
  ];
  const links = {
    'Projects/Missing.md': {
      [source.key]: {
        key: 'Projects/Missing.md',
      },
      'Projects/Other.md': {
        key: 'Projects/Missing.md',
      },
    },
    'Projects/Removed.md': {
      [source.key]: {
        key: 'Projects/Removed.md',
      },
    },
    'Projects/Current.md': {
      'Projects/Other.md': {
        key: 'Projects/Current.md',
      },
    },
    'Projects/Unrelated.md': {
      'Projects/Other.md': {
        key: 'Projects/Unrelated.md',
      },
    },
  };
  const collection = {
    links,
    build_links_map_calls: 0,
    build_links_map() {
      this.build_links_map_calls += 1;
    },
  };

  const result = SmartSources.prototype.update_links_map.call(
    collection,
    source,
    previous_outlinks,
  );

  t.is(result, links);
  t.is(collection.links, links);
  t.is(collection.build_links_map_calls, 0);
  t.deepEqual(collection.links['Projects/Missing.md'], {
    'Projects/Other.md': {
      key: 'Projects/Missing.md',
    },
  });
  t.false('Projects/Removed.md' in collection.links);
  t.deepEqual(collection.links['Projects/Current.md'], {
    'Projects/Other.md': {
      key: 'Projects/Current.md',
    },
    [source.key]: {
      key: 'Projects/Current.md',
      section: 'Current section',
    },
  });
  t.deepEqual(collection.links['Projects/Unrelated.md'], {
    'Projects/Other.md': {
      key: 'Projects/Unrelated.md',
    },
  });
});

test('run_re_import rebuilds links and flushes source and block saves without embeddings', async t => {
  const calls = [];
  const source = {
    key: 'Notes/Changed.md',
    should_embed: false,
    blocks: [],
    async import() { calls.push('import'); },
  };
  const collection = {
    sources_re_import_queue: {
      [source.key]: { source },
    },
    sources_re_import_timeout: null,
    sources_re_import_halted: false,
    block_collection: {
      settings: { embed_blocks: true },
      async process_save_queue() { calls.push('blocks:save'); },
    },
    set_import_progress_state() {},
    emit_event() {},
    build_links_map() { calls.push('links:build'); },
    async process_save_queue() { calls.push('sources:save'); },
  };

  await SmartSources.prototype.run_re_import.call(collection);

  t.deepEqual(calls, [
    'import',
    'links:build',
    'sources:save',
    'blocks:save',
  ]);
  t.deepEqual(collection.sources_re_import_queue, {});
});

test('run_re_import excludes deselected blocks with stale queue flags', async t => {
  const parent = {
    key: 'Notes/Changed.md#Parent',
    _queue_embed: true,
    should_embed: false,
    is_unembedded: true,
  };
  const child = {
    key: 'Notes/Changed.md#Parent#{1}',
    _queue_embed: false,
    should_embed: true,
    is_unembedded: true,
  };
  const source = {
    key: 'Notes/Changed.md',
    should_embed: false,
    blocks: [parent, child],
    async import() {},
  };
  const embedded_keys = [];
  const collection = {
    sources_re_import_queue: {
      [source.key]: { source },
    },
    sources_re_import_timeout: null,
    sources_re_import_halted: false,
    block_collection: {
      settings: { embed_blocks: true },
      async process_save_queue() {},
    },
    set_import_progress_state() {},
    emit_event() {},
    build_links_map() {},
    async process_save_queue() {},
    async process_embed_queue() {
      embedded_keys.push(...this._embed_queue.map((item) => item.key));
    },
  };

  await SmartSources.prototype.run_re_import.call(collection);

  t.deepEqual(embedded_keys, [child.key]);
  t.false(parent._queue_embed);
  t.true(child._queue_embed);
});

test('run_re_import processes only its targeted queue when the cached queue is dirty', async t => {
  const source = {
    key: 'Notes/Changed.md',
    should_embed: true,
    blocks: [{
      key: 'Notes/Changed.md#Block',
      _queue_embed: true,
      should_embed: true,
      is_unembedded: true,
    }],
    async import() {
      collection._embed_queue = [];
      collection._embed_queue_ready = false;
    },
  };
  const embedded_keys = [];
  let global_queue_rebuilds = 0;
  const collection = {
    sources_re_import_queue: {
      [source.key]: { source },
    },
    sources_re_import_timeout: null,
    sources_re_import_halted: false,
    _embed_queue: [],
    _embed_queue_ready: false,
    block_collection: {
      settings: { embed_blocks: true },
      async process_save_queue() {},
    },
    set_import_progress_state() {},
    emit_event() {},
    build_links_map() {},
    async process_save_queue() {},
    async process_embed_queue() {
      embedded_keys.push(...this.embed_queue.map((item) => item.key));
    },
    mark_embed_queue_dirty() {
      this._embed_queue = [];
      this._embed_queue_ready = false;
    },
  };
  Object.defineProperty(collection, 'embed_queue', {
    get() {
      if (this._embed_queue_ready) return this._embed_queue || [];
      global_queue_rebuilds += 1;
      return [{ key: 'Notes/Unrelated.md' }];
    },
  });

  await SmartSources.prototype.run_re_import.call(collection);

  t.is(global_queue_rebuilds, 0);
  t.deepEqual(embedded_keys, [
    'Notes/Changed.md',
    'Notes/Changed.md#Block',
  ]);
  t.false(collection._embed_queue_ready);
});

test('run_re_import serializes overlapping targeted queues', async t => {
  let release_first_embed;
  let mark_first_embed_started;
  const first_embed_gate = new Promise((resolve) => {
    release_first_embed = resolve;
  });
  const first_embed_started = new Promise((resolve) => {
    mark_first_embed_started = resolve;
  });
  const source_a = {
    key: 'Notes/A.md',
    data: {},
    should_embed: true,
    blocks: [],
    async import() {},
  };
  const source_b = {
    key: 'Notes/B.md',
    data: {},
    should_embed: true,
    blocks: [],
    async import() {},
  };
  const embedded_queues = [];
  let active_embed_calls = 0;
  let max_active_embed_calls = 0;
  let global_queue_rebuilds = 0;
  const collection = {
    sources_re_import_queue: {
      [source_a.key]: { source: source_a },
    },
    sources_re_import_timeout: null,
    sources_re_import_halted: false,
    _embed_queue: [],
    _embed_queue_ready: false,
    block_collection: {
      settings: { embed_blocks: false },
      async process_save_queue() {},
    },
    set_import_progress_state() {},
    emit_event() {},
    build_links_map() {},
    async process_save_queue() {},
    async process_embed_queue() {
      active_embed_calls += 1;
      max_active_embed_calls = Math.max(
        max_active_embed_calls,
        active_embed_calls,
      );
      embedded_queues.push(this.embed_queue.map((item) => item.key));
      try {
        if (embedded_queues.length === 1) {
          mark_first_embed_started();
          await first_embed_gate;
        }
      } finally {
        active_embed_calls -= 1;
      }
    },
    mark_embed_queue_dirty() {
      this._embed_queue = [];
      this._embed_queue_ready = false;
    },
  };
  Object.defineProperty(collection, 'embed_queue', {
    configurable: true,
    get() {
      if (this._embed_queue_ready) return this._embed_queue || [];
      global_queue_rebuilds += 1;
      return [{ key: 'Notes/Unrelated.md' }];
    },
  });

  const original_log = console.log;
  console.log = () => {};
  try {
    const first_run = SmartSources.prototype.run_re_import.call(collection);
    await first_embed_started;

    SmartSources.prototype.queue_source_re_import.call(collection, source_b);
    const second_run = SmartSources.prototype.run_re_import.call(collection);

    release_first_embed();
    await Promise.all([first_run, second_run]);
  } finally {
    console.log = original_log;
  }

  t.deepEqual(embedded_queues, [
    [source_a.key],
    [source_b.key],
  ]);
  t.is(max_active_embed_calls, 1);
  t.is(global_queue_rebuilds, 0);
  t.deepEqual(collection.sources_re_import_queue, {});
  t.false(collection._embed_queue_ready);
  t.is(collection._run_re_import_promise, null);
});

test('run_re_import retains a same-source request queued during import', async t => {
  let import_count = 0;
  const source = {
    key: 'Notes/Changed.md',
    data: {},
    should_embed: false,
    blocks: [],
    async import() {
      import_count += 1;
      if (import_count === 1) {
        SmartSources.prototype.queue_source_re_import.call(collection, source);
      }
    },
  };
  const collection = {
    sources_re_import_queue: {
      [source.key]: { source },
    },
    sources_re_import_timeout: null,
    sources_re_import_halted: false,
    block_collection: {
      settings: { embed_blocks: false },
      async process_save_queue() {},
    },
    set_import_progress_state() {},
    emit_event() {},
    build_links_map() {},
    async process_save_queue() {},
  };

  await SmartSources.prototype.run_re_import.call(collection);

  t.is(import_count, 2);
  t.deepEqual(collection.sources_re_import_queue, {});
});

test('run_re_import dirties its targeted queue when embedding fails', async t => {
  const source = {
    key: 'Notes/Changed.md',
    data: {},
    should_embed: true,
    blocks: [],
    async import() {},
  };
  let dirty_calls = 0;
  const collection = {
    sources_re_import_queue: {
      [source.key]: { source },
    },
    sources_re_import_timeout: null,
    sources_re_import_halted: false,
    _embed_queue: [],
    _embed_queue_ready: false,
    block_collection: {
      settings: { embed_blocks: false },
      async process_save_queue() {},
    },
    set_import_progress_state() {},
    emit_event() {},
    build_links_map() {},
    async process_save_queue() {},
    async process_embed_queue() {
      throw new Error('embedding failed');
    },
    mark_embed_queue_dirty() {
      dirty_calls += 1;
      this._embed_queue = [];
      this._embed_queue_ready = false;
    },
  };

  await t.throwsAsync(
    SmartSources.prototype.run_re_import.call(collection),
    { message: 'embedding failed' },
  );

  t.is(dirty_calls, 1);
  t.deepEqual(collection._embed_queue, []);
  t.false(collection._embed_queue_ready);
  t.is(collection._run_re_import_promise, null);
});
