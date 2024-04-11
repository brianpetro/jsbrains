const test = require('ava');
const { init_brain, init_test_item } = require('./test_env');
const { create_uid } = require('./helpers');
test.beforeEach((t) => {
  init_brain(t);
  init_test_item(t);
});
// Collection tests
test('Collection constructor sets the brain property', async (t) => {
  const { brain, test_collection } = t.context;
  t.is(test_collection.brain, brain);
});

test('Collection constructor sets the config property', async (t) => {
  const { test_collection } = t.context;
  t.is(test_collection.config, test_collection.brain.config);
});

test('Collection constructor sets the items property', async (t) => {
  const { test_collection, test_item } = t.context;
  t.deepEqual(test_collection.items, { [test_item.key]: test_item });
});

test('Collection constructor sets the keys property', async (t) => {
  const { test_collection, test_item } = t.context;
  t.deepEqual(test_collection.keys, [test_item.key]);
});

test('Collection constructor sets the LTM property', async (t) => {
  const { test_collection } = t.context;
  t.is(test_collection.LTM.collection, test_collection);
});

test('Collection merge_defaults merges settings from config', async (t) => {
  const { test_collection } = t.context;
  t.is(test_collection.test_item_config, 'test_item_config_value');
});

test('Collection load calls LTM.load', async (t) => {
  const { test_collection } = t.context;
  test_collection.LTM.load = () => t.pass();
  test_collection.load();
});

// CollectionItem tests
test('CollectionItem constructor sets the brain property', async (t) => {
  const { brain, test_item } = t.context;
  t.is(test_item.brain, brain);
});

test('CollectionItem constructor sets the data class_name property', async (t) => {
  const { test_item } = t.context;
  t.is(test_item.data.class_name, 'TestItem');
});

test('CollectionItem merge_defaults merges defaults from all classes in the inheritance chain', async (t) => {
  const { brain } = t.context;
  const parent = brain.parents.create_or_update();
  const child = brain.childs.create_or_update();
  const grand = brain.grands.create_or_update();
  t.is(parent.data.parent_prop, 'parent_value');
  t.is(parent.data.child_prop, null);
  t.is(parent.data.grand_prop, null);
  t.is(child.data.parent_prop, 'child_value');
  t.is(child.data.child_prop, 'child_value');
  t.is(child.data.grand_prop, null);
  t.is(grand.data.parent_prop, 'grand_value');
  t.is(grand.data.child_prop, 'grand_value');
  t.is(grand.data.grand_prop, 'grand_value');
});

test('CollectionItem update_data deep merges the provided data with the existing data', async (t) => {
  const { test_item } = t.context;
  test_item.data = {
    key: 'item_key',
    value: 'item_value',
    nested: {
      prop1: 'prop1_value',
      prop2: 'prop2_value',
    },
  };
  
  test_item.update_data({
    value: 'updated_value',
    nested: {
      prop2: 'updated_prop2_value',
      prop3: 'prop3_value',
    },
  });
  
  t.is(test_item.data.key, 'item_key');
  t.is(test_item.data.value, 'updated_value');
  t.is(test_item.data.nested.prop1, 'prop1_value');
  t.is(test_item.data.nested.prop2, 'updated_prop2_value');
  t.is(test_item.data.nested.prop3, 'prop3_value');
});

test('CollectionItem init calls save', async (t) => {
  const { test_item } = t.context;
  test_item.save = () => t.pass();
  test_item.init();
});

test('CollectionItem save calls validate_save, collection.set, and collection.save', async (t) => {
  const { test_item } = t.context;
  test_item.validate_save = () => t.pass();
  test_item.collection.set = () => t.pass();
  test_item.collection.save = () => t.pass();
  test_item.save();
});

test('CollectionItem validate_save returns false if key is null', async (t) => {
  const { test_item } = t.context;
  test_item.get_key = () => null;
  test_item.data.key = null;
  t.false(test_item.validate_save());
});
test('CollectionItem validate_save returns false if key is empty', async (t) => {
  const { test_item } = t.context;
  test_item.get_key = () => '';
  test_item.data.key = '';
  t.false(test_item.validate_save());
});
test('CollectionItem validate_save returns false if key includes undefined', async (t) => {
  const { test_item } = t.context;
  test_item.get_key = () => undefined;
  test_item.data.key = undefined;
  t.false(test_item.validate_save());
});
test('CollectionItem validate_save returns true if key is valid', async (t) => {
  const { test_item } = t.context;
  test_item.get_key = () => 'test';
  test_item.data.key = 'test';
  t.true(test_item.validate_save());
});

test('CollectionItem delete calls collection.delete', async (t) => {
  const { test_item } = t.context;
  test_item.collection.delete = () => t.pass();
  test_item.delete();
});

test('CollectionItem filter returns true by default', async (t) => {
  const { test_item } = t.context;
  t.true(test_item.filter());
});

test('CollectionItem filter returns false if item key is in exclude_keys', async (t) => {
  const { test_item } = t.context;
  t.false(test_item.filter({ exclude_keys: [test_item.key] }));
});

// test('CollectionItem filter returns false if item data does not match pattern', async (t) => {
//   const { test_item } = await init_test_env();
//   t.false(test_item.filter({ pattern: { matcher: 'test', value: 'test' } }));
// });

// test('CollectionItem filter returns true if item data matches pattern', async (t) => {
//   const { test_item } = await init_test_env();
//   test_item.data.test = 'test';
//   t.true(test_item.filter({ pattern: { matcher: 'test', value: 'test' } }));
// });

test('CollectionItem get_key returns md5 hash of JSON.stringify(this.data)', async (t) => {
  const { test_item } = t.context;
  t.is(test_item.get_key(), '13582486438');
});

test('CollectionItem collection getter returns the collection for the item', async (t) => {
  const { test_item, test_collection } = t.context;
  t.is(test_item.collection, test_collection);
});

test('CollectionItem ref getter returns a reference to the item', async (t) => {
  const { test_item } = t.context;
  t.deepEqual(test_item.ref, { collection_name: 'test_items', key: 'test' });
});

test('CollectionItem collection_name getter returns the name of the collection', async (t) => {
  const { test_item } = t.context;
  t.is(test_item.collection_name, 'test_items');
});
// uses get_key() in sub class to generate key
test('CollectionItem key getter returns the sub class get_key() value', async (t) => {
  const { brain } = t.context;
  const child = brain.childs.create_or_update();
  t.is(child.key, 'child_key');
});

test('create_uid(any)-> returns a string', async (t) => {
  const data_1 = ["test", { new: "test" }];
  const len_1 = JSON.stringify(data_1).length;
  const resp_1 = create_uid(data_1);
  t.is(typeof resp_1, "string");
  t.is(resp_1.endsWith(len_1), true);
  const data_2 = { test: "test", new: "test" };
  const len_2 = JSON.stringify(data_2).length;
  const resp_2 = create_uid(data_2);
  t.is(typeof resp_2, "string");
  t.is(resp_2.endsWith(len_2), true);
  const data_3 = "test";
  const len_3 = JSON.stringify(data_3).length;
  const resp_3 = create_uid(data_3);
  t.is(typeof resp_3, "string");
  t.is(resp_3.endsWith(len_3), true);
  const data_4 = 1234;
  const len_4 = JSON.stringify(data_4).length;
  const resp_4 = create_uid(data_4);
  t.is(typeof resp_4, "string");
  t.is(resp_4.endsWith(len_4), true);
  const data_5 = null;
  const len_5 = JSON.stringify(data_5).length;
  const resp_5 = create_uid(data_5);
  t.is(typeof resp_5, "string");
  t.is(resp_5.endsWith(len_5), true);
  const data_6 = true;
  const len_6 = JSON.stringify(data_6).length;
  const resp_6 = create_uid(data_6);
  t.is(typeof resp_6, "string");
  t.is(resp_6.endsWith(len_6), true);
  // does not handle undefined because JSON.stringify(undefined) returns undefined
});