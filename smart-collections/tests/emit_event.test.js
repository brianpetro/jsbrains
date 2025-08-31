import test from 'ava';
import { Collection } from '../collection.js';
import { CollectionItem } from '../item.js';
import { SmartEvents } from '../../smart-events/smart_events.js';

class MockCollectionDataAdapter {
  constructor(collection) {
    this.collection = collection;
  }
  async process_save_queue() {}
  async process_load_queue() {}
}

function create_env() {
  const env = {
    create_env_getter(obj) { Object.defineProperty(obj, 'env', { value: env }); },
    collections: {},
    config: { collections: { test_items: {} } },
    opts: { collections: { test_items: { data_adapter: { collection: MockCollectionDataAdapter } } } },
    item_types: {},
    data_fs: { async write() {}, async read() { return ''; }, async exists() { return false; }, sep: '/' },
    notices: { show() {}, remove() {} },
    settings: {},
  };
  SmartEvents.create(env);
  return env;
}

class TestItem extends CollectionItem {}

class TestItems extends Collection {
  find_by(data) { return data.key ? this.get(data.key) : null; }
}

function create_collection(env) {
  env.item_types.TestItem = TestItem;
  return new TestItems(env, { collection_key: 'test_items', item_type: TestItem });
}

test('collection emit_event appends collection_key', t => {
  const env = create_env();
  const collection = create_collection(env);
  let captured;
  env.events.on('foo:bar', e => { captured = e; });
  collection.emit_event('foo:bar', { a: 1 });
  t.is(captured.collection_key, 'test_items');
  t.is(captured.a, 1);
  t.truthy(captured.at);
});

test('item emit_event appends item metadata', t => {
  const env = create_env();
  const item = new TestItem(env, { key: 'one', class_name: 'TestItem' });
  let captured;
  env.events.on('foo:bar', e => { captured = e; });
  item.emit_event('foo:bar', { b: 2 });
  t.is(captured.collection_key, item.collection_key);
  t.is(captured.item_key, 'one');
  t.is(captured.b, 2);
  t.truthy(captured.at);
});
