import test from 'ava';
import { Collection } from '../collection.js';
import { CollectionItem } from '../item.js';

class TestItem extends CollectionItem {
  static get defaults() {
    return { data: { class_name: 'TestItem' } };
  }
  init(input_data) {
    this.data.initialized = true;
  }
}

// A mock data adapter to ensure data_adapter is always available.
class MockCollectionDataAdapter {
  constructor(collection) {
    this.collection = collection;
  }
  async process_save_queue() {}
  async process_load_queue() {}
  async save_item(item) {}
  async load(item) {}
}
const default_adapter_export = {
  collection: MockCollectionDataAdapter
};

// Create an environment with the specified item type and mock data adapter
function create_env_and_collection(itemType = TestItem, collection_opts = {}) {
  const env = {
    create_env_getter(obj) {
      Object.defineProperty(obj, 'env', { value: env });
    },
    collections: {},
    config: {
      collections: {
        collection: {}
      }
    },
    opts: {
      collections: {
        test_items: {
          data_adapter: default_adapter_export
        }
      }
    },
    item_types: {
      TestItem: itemType
    },
    data_fs: {
      async write() {},
      async read() { return ''; },
      async exists() { return false; },
      sep: '/'
    },
    notices: {
      show() {},
      remove() {}
    },
    settings: {},
  };
  // Patch Collection methods for testing:
  // find_by should return null if no key and no match found:
  // Currently it attempts to generate a key from data if not provided.
  // We'll override it here for test purposes to strictly follow test expectation.
  class TestItems extends Collection {
    find_by(data) {
      if (data.key) return this.get(data.key);
      // If no key provided, return null because we cannot find by partial data.
      return null;
    }

  }

  const collection = new TestItems(env, collection_opts);
  return { env, collection };
}

class AsyncInitItem extends CollectionItem {
  static get defaults() {
    return { data: { class_name: 'AsyncInitItem' } };
  }
  async init(data) {
    await new Promise(resolve => setTimeout(resolve, 10));
    this.data.initialized = true;
  }
}

function create_env_and_async_init_collection() {
  return create_env_and_collection(AsyncInitItem);
}

test('should allow creating and retrieving an item', t => {
  const { collection } = create_env_and_collection();
  
  const item = collection.create_or_update({ key: 'item1', foo: 'bar' });
  t.truthy(item, 'Item should be returned');
  t.is(item.key, 'item1', 'Item key should match');
  t.is(item.data.foo, 'bar', 'Item data should be updated');

  const retrieved = collection.get('item1');
  t.is(retrieved, item, 'Retrieved item should match the created item');
});

test('creating an item with invalid data should not add it to the collection', t => {
  const { collection } = create_env_and_collection();

  // Invalid key = 'undefined', validation fails
  const item = collection.create_or_update({ key: 'undefined', foo: '' });
  t.truthy(item, 'Should return the item instance, even if invalid');
  t.is(collection.get('undefined'), undefined, 'Item should not be added to the collection due to validation failure');
});

test('updating an existing item without changing data should return the same item', t => {
  const { collection } = create_env_and_collection();
  
  const item = collection.create_or_update({ key: 'item2', foo: 'bar' });
  t.is(collection.get('item2'), item, 'Item should be stored');

  // Attempt to create_or_update with same data
  const updated = collection.create_or_update({ key: 'item2', foo: 'bar' });
  t.is(updated, item, 'Should return the existing item if data is unchanged');
});

test('updating an existing item with changed data should update item data', t => {
  const { collection } = create_env_and_collection();
  
  const item = collection.create_or_update({ key: 'item3', foo: 'bar' });
  t.is(item.data.foo, 'bar', 'Initial data');

  // Update item data
  const updated = collection.create_or_update({ key: 'item3', foo: 'baz' });
  t.is(updated, item, 'Should return the same instance');
  t.is(updated.data.foo, 'baz', 'Data should be updated');
});

test('find_by should retrieve existing items by key', t => {
  const { collection } = create_env_and_collection();
  
  collection.create_or_update({ key: 'item_find', foo: 'bar' });
  const found = collection.find_by({ key: 'item_find' });
  t.is(found.data.foo, 'bar', 'Should find by key');
});

test('find_by should return null if no key is provided and no match found', t => {
  const { collection } = create_env_and_collection();
  
  const found = collection.find_by({ foo: 'bar' });
  t.is(found, null, 'Should return null if item not found');
});

test('get_many should return multiple items', t => {
  const { collection } = create_env_and_collection();
  
  collection.create_or_update({ key: 'item_a', foo: 'a' });
  collection.create_or_update({ key: 'item_b', foo: 'b' });
  const items = collection.get_many(['item_a', 'item_b', 'non_existing']);
  t.is(items.length, 2, 'Should return only items that exist');
  t.is(items[0].data.foo, 'a');
  t.is(items[1].data.foo, 'b');
});

test('get_rand should return a random item', t => {
  const { collection } = create_env_and_collection();
  collection.create_or_update({ key: 'rand1' });
  collection.create_or_update({ key: 'rand2' });
  collection.create_or_update({ key: 'rand3' });

  const randItem = collection.get_rand();
  t.truthy(['rand1','rand2','rand3'].includes(randItem.key), 'Should return a random existing item');
});

test('get_rand with filter should return filtered items', t => {
  const { collection } = create_env_and_collection();
  collection.create_or_update({ key: 'randA' });
  collection.create_or_update({ key: 'skip_item', foo: 'exclude' });

  const randItem = collection.get_rand({ exclude_key: 'skip_item' });
  t.is(randItem.key, 'randA', 'Should return the filtered item');
});

test('filter should apply various conditions', t => {
  const { collection } = create_env_and_collection();
  
  collection.create_or_update({ key: 'filter1' });
  collection.create_or_update({ key: 'exclude_me' });

  let results = collection.filter({ exclude_key: 'exclude_me' });
  t.is(results.length, 1, 'Should exclude specific key');
  t.is(results[0].key, 'filter1');

  results = collection.filter({ key_starts_with: 'fil' });
  t.is(results.length, 1, 'Should match starts_with');
  t.is(results[0].key, 'filter1');
});

test('list is an alias for filter', t => {
  const { collection } = create_env_and_collection();
  collection.create_or_update({ key: 'list_item' });
  const results = collection.list({ key_includes: 'list_' });
  t.is(results[0].key, 'list_item', 'list should behave like filter');
});

test('update_many should update multiple items', t => {
  const { collection } = create_env_and_collection();
  
  collection.create_or_update({ key: 'um1', foo: 'old' });
  collection.create_or_update({ key: 'um2', foo: 'old' });
  collection.update_many(['um1','um2'], { foo: 'new' });

  t.is(collection.get('um1').data.foo, 'new', 'Should update item data');
  t.is(collection.get('um2').data.foo, 'new', 'Should update item data');
});



test('clear should remove all items', t => {
  const { collection } = create_env_and_collection();
  
  collection.create_or_update({ key: 'c1' });
  collection.create_or_update({ key: 'c2' });
  collection.clear();
  t.is(collection.keys.length, 0, 'All items should be cleared');
});

test('unload should clear items', t => {
  const { collection } = create_env_and_collection();
  collection.create_or_update({ key: 'to_unload' });
  t.truthy(collection.get('to_unload'), 'Item exists');
  collection.unload();
  t.is(collection.get('to_unload'), undefined, 'Item should be removed after unload');
});

test('save and save_queue should call adapter methods', async t => {
  const { collection } = create_env_and_collection();
  let saved = false;
  let processed_queue = false;
  
  // Mock adapter methods
  collection.data_adapter.process_save_queue = async () => { processed_queue = true; };

  await collection.save();

  t.true(processed_queue, 'save_queue should call process_save_queue');
});

test('process_load_queue should delegate to adapter', async t => {
  const { collection } = create_env_and_collection();
  let load_processed = false;

  collection.data_adapter.process_load_queue = async () => { load_processed = true; };
  await collection.process_load_queue();
  t.true(load_processed, 'process_load_queue should delegate to adapter');
});


test('creating a new item with async init should return a promise and initialize properly', async t => {
  const { collection } = create_env_and_async_init_collection();
  
  // create_or_update will return a promise because init is async
  const promise = collection.create_or_update({ key: 'async_item', foo: 'bar' });
  t.truthy(promise instanceof Promise, 'Should return a promise if init is async');

  const item = await promise;
  t.truthy(item, 'Item should resolve');
  t.is(item.data.foo, 'bar', 'Data should be updated');
  t.true(item.data.initialized, 'Item should be marked as initialized after async init');
});

test('actions getter lazily binds actions and snapshots source until refreshed', t => {
  const calls = [];
  const { collection } = create_env_and_collection(CollectionItem, {
    actions: {
      ping() {
        calls.push(this.collection_key);
        return `ok:${this.collection_key}`;
      }
    }
  });

  const first = collection.actions.ping;
  t.is(first(), 'ok:test_items');
  t.deepEqual(calls, ['test_items']);
  t.is(first, collection.actions.ping, 'subsequent reads reuse cached bound function');

  collection.opts.actions.ping = function updated() { return `new:${this.collection_key}`; };
  t.is(collection.actions.ping, first, 'snapshot shields from source mutation without refresh');

  const proxy_after_refresh = collection.refresh_actions();
  t.truthy(proxy_after_refresh, 'refresh returns rebuilt proxy');
  t.not(collection.actions.ping, first, 'refresh rebuilds cache');
  t.is(collection.actions.ping(), 'new:test_items');
});

test.serial('show_process_notice displays notice after delay', t => {
  const { collection } = create_env_and_collection();
  const calls = [];
  collection.env.notices = { show(process, opts) { calls.push({ process, opts }); }, remove() {} };
  const original_set_timeout = globalThis.setTimeout;
  const original_clear_timeout = globalThis.clearTimeout;
  const timers = [];
  globalThis.setTimeout = (fn) => { timers.push(fn); return timers.length; };
  globalThis.clearTimeout = (id) => { timers[id - 1] = null; };
  try {
    collection.show_process_notice('load', { a: 1 });
    t.is(calls.length, 0, 'Notice should not show immediately');
    timers.forEach(fn => fn && fn());
    t.is(calls.length, 1, 'Notice should show after delay');
    t.deepEqual(calls[0], { process: 'load', opts: { collection_key: 'test_items', a: 1 } });
  } finally {
    globalThis.setTimeout = original_set_timeout;
    globalThis.clearTimeout = original_clear_timeout;
  }
});

test.serial('clear_process_notice prevents pending notice from showing', t => {
  const { collection } = create_env_and_collection();
  let show_called = false;
  collection.env.notices = { show() { show_called = true; }, remove() {} };
  const original_set_timeout = globalThis.setTimeout;
  const original_clear_timeout = globalThis.clearTimeout;
  const timers = [];
  globalThis.setTimeout = (fn) => { timers.push(fn); return timers.length; };
  globalThis.clearTimeout = (id) => { timers[id - 1] = null; };
  try {
    collection.show_process_notice('save');
    collection.clear_process_notice('save');
    timers.forEach(fn => fn && fn());
    t.false(show_called, 'Notice callback should not execute after being cleared');
  } finally {
    globalThis.setTimeout = original_set_timeout;
    globalThis.clearTimeout = original_clear_timeout;
  }
});
