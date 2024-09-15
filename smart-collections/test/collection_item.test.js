import test from 'ava';
import { load_test_env } from './_env.js';
import { CollectionItem } from '../main.js';

test.beforeEach(async t => { await load_test_env(t); });

test('CollectionItem constructor initializes with correct data', t => {
  const { env } = t.context;
  const item = new CollectionItem(env, { key: 'test_item', data: 'test_data' });

  t.is(item.data.key, 'test_item');
  t.is(item.data.data, 'test_data');
  t.is(item.data.class_name, 'CollectionItem');
});

test('CollectionItem.update_data updates data correctly', t => {
  const { env } = t.context;
  const item = new CollectionItem(env, { key: 'test_item', data: 'initial_data' });

  const updated = item.update_data({ data: 'updated_data' });

  t.true(updated);
  t.is(item.data.data, 'updated_data');
});

test('CollectionItem.update_data returns false if data unchanged', t => {
  const { env } = t.context;
  const item = new CollectionItem(env, { key: 'test_item', data: 'test_data' });

  const updated = item.update_data({ key: 'test_item', data: 'test_data' });

  t.false(updated);
});

test('CollectionItem.validate_save returns false for invalid key', t => {
  const { env } = t.context;
  const item = new CollectionItem(env);

  t.true(item.validate_save());

  item.data.key = ' ';
  t.false(item.validate_save(), `invalid: ${item.key}`);

  item.data.key = 'undefined';
  t.false(item.validate_save(), `invalid: ${item.key}`);
});

test('CollectionItem.validate_save returns true for valid key', t => {
  const { env } = t.context;
  const item = new CollectionItem(env, { key: 'valid_key' });

  t.true(item.validate_save());
});

test('CollectionItem.filter correctly filters items', t => {
  const { env } = t.context;
  const item = new CollectionItem(env, { key: 'test_item' });

  t.true(item.filter({ key_starts_with: 'test' }));
  t.false(item.filter({ key_starts_with: 'other' }));
  t.true(item.filter({ key_ends_with: 'item' }));
  t.false(item.filter({ key_ends_with: 'other' }));
  t.true(item.filter({ key_includes: 'st_it' }));
  t.false(item.filter({ key_includes: 'other' }));
  t.false(item.filter({ exclude_key: 'test_item' }));
  t.true(item.filter({ exclude_key: 'other_item' }));
});

test('CollectionItem.get collection_key returns correct name', t => {
  const { env } = t.context;
  const item = new CollectionItem(env);

  t.is(item.collection_key, 'collection');
});

test('CollectionItem.get ref returns correct reference object', t => {
  const { env } = t.context;
  const item = new CollectionItem(env, { key: 'test_item' });

  t.deepEqual(item.ref, { collection_key: 'collection', key: 'test_item' });
});