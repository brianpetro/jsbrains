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
  const incoming = { list: [2, 3, 4] };
  const expected = { list: [1, 2, 3, 4] }; // 2 is not duplicated
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should concatenate incoming array to non-existent target array', t => {
  const target = { other: 'value' };
  const incoming = { list: [1, 2, 2] };
  const expected = { other: 'value', list: [1, 2] }; // duplicates removed
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

function a_parser() {}
test('same collection version doesn\'t duplicate existing same function in array', t => {
  const target   = { collections: { foo: { class: ColV1, parsers: [a_parser] } } };
  const incoming = { collections: { foo: { class: ColV1, parsers: [a_parser] } } };

  merge_env_config(target, incoming);

  t.is(target.collections.foo.parsers.length, 1,
       'parsers array should not duplicate existing function');

  // Add another function to incoming, ensure both are present, no duplicates
  function b_parser() {}
  const target2   = { collections: { foo: { class: ColV1, parsers: [a_parser] } } };
  const incoming2 = { collections: { foo: { class: ColV1, parsers: [a_parser, b_parser] } } };
  merge_env_config(target2, incoming2);
  t.deepEqual(target2.collections.foo.parsers, [a_parser, b_parser],
       'should merge arrays without duplicates and include new items');
});

// Test merging arrays of strings prevents duplicates
test('should merge arrays of strings without duplicates', t => {
  const target = { tags: ['a', 'b'] };
  const incoming = { tags: ['b', 'c', 'd'] };
  const expected = { tags: ['a', 'b', 'c', 'd'] };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected, 'strings in arrays should not be duplicated');
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

test('newer component version replaces older one', t => {
  const old_component = function() {};
  const new_component = function() {};
  new_component.version = 2;
  const target = { components: { test_component: old_component } };
  const incoming = { components: { test_component: new_component } };

  merge_env_config(target, incoming);

  t.is(target.components.test_component, new_component,
       'newer component replaces older one');
});

test('merges item actions without overwriting', t => {
  const target = { items: { note: { actions: { a: 1 } } } };
  const incoming = { items: { note: { actions: { b: 2, a: 3 } } } };
  merge_env_config(target, incoming);
  t.deepEqual(target.items.note.actions, { a: 1, b: 2 });
});

test('adds new item definition when missing', t => {
  const target = { items: {} };
  const incoming = { items: { block: { actions: { c: 3 } } } };
  merge_env_config(target, incoming);
  t.deepEqual(target.items.block.actions, { c: 3 });
});