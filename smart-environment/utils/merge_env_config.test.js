import test from 'ava';
import { merge_env_config } from './merge_env_config.js';
import { deep_merge_no_overwrite } from './deep_merge_no_overwrite.js';

test('should merge simple properties', t => {
  const target = { a: 1 };
  const incoming = { b: 2 };
  const expected = { a: 1, b: 2 };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should overwrite existing primitive properties', t => {
  const target = { a: 1 };
  const incoming = { a: 2 };
  const expected = { a: 2 };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should concatenate arrays', t => {
  const target = { list: [1, 2] };
  const incoming = { list: [3, 4] };
  const expected = { list: [1, 2, 3, 4] };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should concatenate incoming array to non-existent target array', t => {
  const target = { other: 'value' };
  const incoming = { list: [1, 2] };
  const expected = { other: 'value', list: [1, 2] };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should initialize target object key if merging object', t => {
  const target = {};
  const incoming = { nested: { a: 1 } };
  const expected = { nested: { a: 1 } };
  merge_env_config(target, incoming);
  t.deepEqual(target, expected);
});

test('should merge null values', t => {
  const target = { a: 1 };
  const incoming = { b: null };
  const expected = { a: 1, b: null };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should overwrite with null value', t => {
  const target = { a: 1 };
  const incoming = { a: null };
  const expected = { a: null };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});


test('should handle empty incoming object', t => {
  const target = { a: 1 };
  const incoming = {};
  const expected = { a: 1 };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
  t.is(result, target); // Should return the same target object instance
});

test('should handle empty target object', t => {
  const target = {};
  const incoming = { a: 1, b: [2], c: { d: 3 } };
  merge_env_config(target, incoming); // Modifies target in place
  const expected_after_merge = { a: 1, b: [2], c: {} }; // c initialized
  deep_merge_no_overwrite(expected_after_merge.c, {d: 3}) // deep merge applied

  t.deepEqual(target, expected_after_merge);
});

test('should not merge if incoming value is same object reference as target', t => {
    const shared_object = { x: 1 };
    const target = { a: shared_object };
    const incoming = { a: shared_object };
    const expected = { a: { x: 1 } }; // Should remain unchanged

    const result = merge_env_config(target, incoming);
    t.deepEqual(result, expected);
    t.is(result.a, shared_object); // Ensure reference wasn't broken unnecessarily
});


class ColV1 {}  ColV1.version = 1;
class ColV2 {}  ColV2.version = 2;

test('newer collection version replaces older one', t => {
  const target   = { collections: { foo: { class: ColV1, flag: true } } };
  const incoming = { collections: { foo: { class: ColV2 } } };

  merge_env_config(target, incoming);

  t.is(target.collections.foo.class, ColV2,
       'incoming class replaces the older version');
  t.true(target.collections.foo.flag,
       'non-conflicting props are preserved');
});

test('older or same version does NOT replace BUT includes extra props', t => {
  const target   = { collections: { foo: { class: ColV2 } } };
  const incoming = { collections: { foo: { class: ColV1, extra: 123 } } };

  merge_env_config(target, incoming);

  t.is(target.collections.foo.class, ColV2,
       'existing newer class kept');
  t.is(target.collections.foo.extra, 123,
       'older definition merged with no overwrite');
});
