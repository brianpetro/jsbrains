import test from 'ava';
import { load_test_env } from './_env.js';
import { Collection } from '../main.js';

test.beforeEach(async t => {
  await load_test_env(t);
});

// test should contain env.collection.settings.single_file_data_path from env default_settings
test.serial('Collection.load creates a new collection instance and settings are loaded', t => {
  const { env } = t.context;
  t.is(env.collection.settings.single_file_data_path, '_data.json', 'Expected single_file_data_path to be "./test/_data.json"');
});

// ensure items are loaded
test.serial('Loaded Collection should contain saved items', async t => {
  const { env } = t.context;
  console.log('env.env_data_dir', env.env_data_dir);
  console.log('env.collection.adapter.data_path', env.collection.adapter.data_path);
  console.log('env.collection.adapter.json_data', env.collection.adapter.json_data);
  console.log('env.collection.adapter.fs.opts', env.collection.adapter.fs.opts);
  t.is(Object.keys(env.collection.items).length, 9, 'Expected 9 items to be loaded');
});

/**
 * Tests basic initialization of the collection.
*/
test.serial('Collection.load creates a new collection instance', t => {
  const { env } = t.context;
  const test_collection = env.collection;

  t.true(test_collection instanceof Collection, 'Expected `env.collection` to be instance of Collection');
  t.is(test_collection.collection_key, 'collection', 'Expected collection_key to be "collection"');
});

/**
 * Tests that create_or_update adds a new item.
 */
test.serial('Collection.create_or_update creates a new item', t => {
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
test.serial('Collection.create_or_update updates an existing item', t => {
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
test.serial('Collection.find_by returns the correct item', t => {
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
test.serial('Collection.filter returns correct items', t => {
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
test.serial('Collection.get_many returns correct items', t => {
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
test.serial('Collection.delete_many removes correct items', async t => {
  const { env } = t.context;
  const test_collection = env.collection;
  
  // Ensure data is loaded
  await test_collection.data_adapter.load_json_data();
  const initial_count = Object.keys(test_collection.items).length;

  // Create test items
  const item1 = await test_collection.create_or_update({ key: 'item1', data: 'data1' });
  const item2 = await test_collection.create_or_update({ key: 'item2', data: 'data2' });
  const item3 = await test_collection.create_or_update({ key: 'item3', data: 'data3' });

  // Wait for saves to complete
  await test_collection.save_queue();

  t.is(
    Object.keys(test_collection.items).length,
    initial_count + 3,
    'After adding 3 items, total count should increase by 3'
  );

  // Delete items
  test_collection.delete_many(['item1', 'item2']);
  await test_collection.save_queue();

  t.is(
    Object.keys(test_collection.items).length,
    initial_count + 1,
    'After deleting two items, total should decrease by 2'
  );

  t.truthy(test_collection.get('item3'), 'item3 should still exist');

  // Delete last item
  test_collection.delete_many(['item3']);
  await test_collection.save_queue();

  t.is(
    Object.keys(test_collection.items).length,
    initial_count,
    'After deleting last item, total should match initial count'
  );
});
