import test from 'ava';
import { SmartContexts } from './smart_contexts.js';

test('process_load_queue migrates legacy rows merged into existing items', async (t) => {
  const item = {
    data: {
      context_items: {},
      exclusions: {},
    },
    queue_save_calls: 0,
    queue_save() {
      this.queue_save_calls += 1;
    },
  };
  const scope = {
    items: {
      Current: item,
    },
    data_adapter: {
      async process_load_queue() {
        item.data.context_items['notes/a.md'] = {
          key: 'notes/a.md',
          exclude: true,
        };
      },
    },
  };

  await SmartContexts.prototype.process_load_queue.call(scope);

  t.false('notes/a.md' in item.data.context_items);
  t.like(item.data.exclusions['notes/a.md'], {
    key: 'notes/a.md',
    kind: 'source',
    source_path: 'notes/a.md',
    exclude: true,
  });
  t.is(item.queue_save_calls, 1);
});

test('process_load_queue does not queue unchanged contexts', async (t) => {
  const item = {
    data: {
      context_items: {
        'notes/a.md': {
          key: 'notes/a.md',
        },
      },
      exclusions: {},
    },
    queue_save_calls: 0,
    queue_save() {
      this.queue_save_calls += 1;
    },
  };
  const scope = {
    items: {
      Current: item,
    },
    data_adapter: {
      async process_load_queue() {},
    },
  };

  await SmartContexts.prototype.process_load_queue.call(scope);

  t.is(item.queue_save_calls, 0);
});
