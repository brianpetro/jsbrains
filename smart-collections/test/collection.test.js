import test from 'ava';
import { load_test_env } from './_env.js';
import { Collection } from '../main.js';

test.beforeEach(async t => {
  await load_test_env(t);
});

// test should contain env.collection.settings.single_file_data_path from env default_settings
test('Collection.load creates a new collection instance and settings are loaded', t => {
  const { env } = t.context;
  t.is(env.collection.settings.single_file_data_path, './test/_data.json', 'Expected single_file_data_path to be "./test/_data.json"');
});

/**
 * Tests basic initialization of the collection.
*/
test('Collection.load creates a new collection instance', t => {
  const { env } = t.context;
  const test_collection = env.collection;

  t.true(test_collection instanceof Collection, 'Expected `env.collection` to be instance of Collection');
  t.is(test_collection.collection_key, 'collection', 'Expected collection_key to be "collection"');
});

/**
 * Tests that create_or_update adds a new item.
 */
test('Collection.create_or_update creates a new item', t => {
  const { env } = t.context;
  const test_collection = env.collection;

  const new_item = test_collection.create_or_update({ key: 'test_item', data: 'test_data' });

  t.is(new_item.key, 'test_item', 'Expected the item to have the specified key');
  t.is(new_item.data.data, 'test_data', 'Expected the item data to match input data');
  t.true(new_item._queue_save, 'New item should be queued for saving');
});

/**
 * Tests that create_or_update updates an existing item without re-queueing if data unchanged.
 */
test('Collection.create_or_update updates an existing item', t => {
  const { env } = t.context;
  const test_collection = env.collection;

  test_collection.create_or_update({ key: 'test_item', data: 'initial_data' });
  const updated_item = test_collection.create_or_update({ key: 'test_item', data: 'updated_data' });

  t.is(updated_item.key, 'test_item', 'Item key should not change');
  t.is(updated_item.data.data, 'updated_data', 'Data should be updated to the new value');
  t.false(updated_item._queue_save, 'Existing item updated should not be re-queued unless data changed');
});

/**
 * Tests that find_by returns the correct item.
 */
test('Collection.find_by returns the correct item', t => {
  const { env } = t.context;
  const test_collection = env.collection;

  test_collection.create_or_update({ key: 'test_item', data: 'test_data' });
  const found_item = test_collection.find_by({ key: 'test_item' });

  t.is(found_item.key, 'test_item', 'Found item key should match');
  t.is(found_item.data.data, 'test_data', 'Found item data should match');
});

/**
 * Tests the filter method with key-based filters.
 */
test('Collection.filter returns correct items', t => {
  const { env } = t.context;
  const test_collection = env.collection;

  test_collection.create_or_update({ key: 'item1', data: 'data1' });
  test_collection.create_or_update({ key: 'item2', data: 'data2' });
  test_collection.create_or_update({ key: 'other_item', data: 'data3' });

  const filtered_items = test_collection.filter({ key_starts_with: 'item' });

  t.is(filtered_items.length, 2, 'Should return two items matching the filter');
  t.deepEqual(filtered_items.map(item => item.key).sort(), ['item1', 'item2'], 'Filtered keys should match the items prefixed with "item"');
});

/**
 * Tests get_many with multiple keys.
 */
test('Collection.get_many returns correct items', t => {
  const { env } = t.context;
  const test_collection = env.collection;

  test_collection.create_or_update({ key: 'item1', data: 'data1' });
  test_collection.create_or_update({ key: 'item2', data: 'data2' });

  const items = test_collection.get_many(['item1', 'item2']);

  t.is(items.length, 2, 'Should return two items');
  t.deepEqual(items.map(item => item.key).sort(), ['item1', 'item2'], 'Should retrieve the correct items by their keys');
});

/**
 * Tests that delete_many removes the specified items.
 */
test('Collection.delete_many removes correct items', async t => {
  const { env } = t.context;
  const test_collection = env.collection;
  const test_data_ct = Object.keys(test_collection.adapter.json_data || {}).length;

  t.is(
    Object.keys(test_collection.items).length,
    test_data_ct,
    'Initially, collection items should match test_data count'
  );

  await test_collection.create_or_update({ key: 'item1', data: 'data1' });
  await test_collection.create_or_update({ key: 'item2', data: 'data2' });
  await test_collection.create_or_update({ key: 'item3', data: 'data3' });

  t.is(
    Object.keys(test_collection.items).length,
    test_data_ct + 3,
    'After adding 3 items, total count should increase by 3'
  );

  test_collection.delete_many(['item1', 'item2']);
  await test_collection.save_queue();

  t.is(
    Object.keys(test_collection.items).length,
    test_data_ct + 1,
    'After deleting two items, total should decrease by 2'
  );

  t.truthy(test_collection.get('item3'), 'item3 should still exist');

  // remove last item
  test_collection.delete_many(['item3']);
  await test_collection.save_queue();
  t.is(Object.keys(test_collection.items).length, test_data_ct, 'After deleting last item, total should decrease by 1');
});
