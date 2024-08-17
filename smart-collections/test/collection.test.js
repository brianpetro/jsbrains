import test from 'ava';
import { load_test_env } from './_env.js';
import { Collection } from '../main.js';

test.beforeEach(t => { load_test_env(t); });

test('Collection.load creates a new collection instance', async t => {
  const { env } = t.context;
  await env.init();
  const test_collection = env.collection;

  t.true(test_collection instanceof Collection);
  t.is(test_collection.collection_name, 'collection');
});

test('Collection.create_or_update creates a new item', async t => {
  const { env } = t.context;
  await env.init();
  const test_collection = env.collection;

  const new_item = test_collection.create_or_update({ key: 'test_item', data: 'test_data' });

  t.is(new_item.key, 'test_item');
  t.is(new_item.data.data, 'test_data');
  t.true(new_item.is_new);
});

test('Collection.create_or_update updates an existing item', async t => {
  const { env } = t.context;
  await env.init();
  const test_collection = env.collection;

  test_collection.create_or_update({ key: 'test_item', data: 'initial_data' });
  const updated_item = test_collection.create_or_update({ key: 'test_item', data: 'updated_data' });

  t.is(updated_item.key, 'test_item');
  t.is(updated_item.data.data, 'updated_data');
  t.false(updated_item.is_new);
});

test('Collection.find_by returns the correct item', async t => {
  const { env } = t.context;
  await env.init();
  const test_collection = env.collection;

  test_collection.create_or_update({ key: 'test_item', data: 'test_data' });
  const found_item = test_collection.find_by({ key: 'test_item' });

  t.is(found_item.key, 'test_item');
  t.is(found_item.data.data, 'test_data');
});

test('Collection.filter returns correct items', async t => {
  const { env } = t.context;
  await env.init();
  const test_collection = env.collection;

  test_collection.create_or_update({ key: 'item1', data: 'data1' });
  test_collection.create_or_update({ key: 'item2', data: 'data2' });
  test_collection.create_or_update({ key: 'other_item', data: 'data3' });

  const filtered_items = test_collection.filter({ key_starts_with: 'item' });

  t.is(filtered_items.length, 2);
  t.deepEqual(filtered_items.map(item => item.key).sort(), ['item1', 'item2']);
});

test('Collection.get_many returns correct items', async t => {
  const { env } = t.context;
  await env.init();
  const test_collection = env.collection;

  test_collection.create_or_update({ key: 'item1', data: 'data1' });
  test_collection.create_or_update({ key: 'item2', data: 'data2' });

  const items = test_collection.get_many(['item1', 'item2']);

  t.is(items.length, 2);
  t.deepEqual(items.map(item => item.key).sort(), ['item1', 'item2']);
});

test('Collection.delete_many removes correct items', async t => {
  const { env } = t.context;
  await env.init();
  const test_collection = env.collection;
  const test_data_ct = Object.keys(test_collection.adapter.test_data).length;
  t.is(
    Object.keys(test_collection.items).length,
    test_data_ct,
    'test_collection.items and test_data_ct should have the same length'
  );
  test_collection.create_or_update({ key: 'item1', data: 'data1' });
  test_collection.create_or_update({ key: 'item2', data: 'data2' });
  test_collection.create_or_update({ key: 'item3', data: 'data3' });
  t.is(
    Object.keys(test_collection.items).length,
    test_data_ct + 3,
    'test_collection.items should now have three more items than test_data_ct'
  );
  test_collection.delete_many(['item1', 'item2']);
  await test_collection.save_queue();
  t.is(
    Object.keys(test_collection.items).length,
    test_data_ct + 1,
    'test_collection.items should now have one more item than test_data_ct'
  );

  t.truthy(test_collection.get('item3'));
});