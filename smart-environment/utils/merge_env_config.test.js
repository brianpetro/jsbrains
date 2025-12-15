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
  deep_merge_no_overwrite(expected_after_merge.c, { d: 3 }); // deep merge applied

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

class ColV1 {}
ColV1.version = 1;
class ColV2 {}
ColV2.version = 2;

test('newer collection version replaces older one', t => {
  const target = { collections: { foo: { class: ColV1, flag: true } } };
  const incoming = { collections: { foo: { class: ColV2 } } };

  merge_env_config(target, incoming);

  t.is(
    target.collections.foo.class,
    ColV2,
    'incoming class replaces the older version'
  );
  t.true(
    target.collections.foo.flag,
    'non-conflicting props are preserved'
  );
});

test('should replace action with incoming if version is newer', t => {
  const old_action = { version: 1, action: () => { return 'old' } };
  const new_action = { version: 2, action: () => { return 'new' } };
  const target = { actions: { test: old_action } };
  const incoming = { actions: { test: new_action } };
  merge_env_config(target, incoming);

  t.is(
    target.actions.test,
    new_action,
    'incoming action replaces the older version'
  );
});

/* ------------------------------------------------------------------
 * semver-specific tests
 * -----------------------------------------------------------------*/

class ColSem10 {}
ColSem10.version = '1.0.0';
class ColSem11 {}
ColSem11.version = '1.1.0';

test('collection semver strings are compared correctly', t => {
  const target = {
    collections: { foo: { class: ColSem10, from: 'old', keep: true } }
  };
  const incoming = {
    collections: { foo: { class: ColSem11, from: 'new' } }
  };

  merge_env_config(target, incoming);

  t.is(target.collections.foo.class, ColSem11, 'newer semver wins');
  t.is(target.collections.foo.from, 'new', 'incoming props override');
  t.true(
    target.collections.foo.keep,
    'older props are preserved when not redefined'
  );
});

test('collection missing version is treated as 0 against semver', t => {
  class ColNoVersion {}
  class ColSem001 {}
  ColSem001.version = '0.0.1';

  const target = { collections: { foo: { class: ColNoVersion } } };
  const incoming = { collections: { foo: { class: ColSem001 } } };

  merge_env_config(target, incoming);

  t.is(
    target.collections.foo.class,
    ColSem001,
    'semver 0.0.1 should beat missing version (0)'
  );
});

test('semver string wins tie with numeric version', t => {
  function ComponentV1Num () {}
  ComponentV1Num.version = 1;
  function ComponentV1Str () {}
  ComponentV1Str.version = '1';

  const target = { components: { thing: ComponentV1Num } };
  const incoming = { components: { thing: ComponentV1Str } };

  merge_env_config(target, incoming);

  t.is(
    target.components.thing,
    ComponentV1Str,
    'string semver "1" should win over numeric 1 when numerically equal'
  );
});

test('component semver string compares against numeric version', t => {
  function CompV1 () {}
  CompV1.version = 1;
  function CompV101 () {}
  CompV101.version = '1.0.1';

  const target = { components: { c: CompV1 } };
  const incoming = { components: { c: CompV101 } };

  merge_env_config(target, incoming);

  t.is(
    target.components.c,
    CompV101,
    '1.0.1 should be considered newer than numeric 1'
  );
});

test('item_types semver strings are respected', t => {
  function ItemTypeV1 () {}
  ItemTypeV1.version = '1.0.0';
  function ItemTypeV2 () {}
  ItemTypeV2.version = '2.0.0';

  const target = { item_types: { Foo: ItemTypeV1 } };
  const incoming = { item_types: { Foo: ItemTypeV2 } };

  merge_env_config(target, incoming);

  t.is(
    target.item_types.Foo,
    ItemTypeV2,
    'item_types should use semver to pick newer constructor'
  );
});

function a_parser () {}
test("same collection version doesn't duplicate existing same function in array", t => {
  const target = {
    collections: { foo: { class: ColV1, parsers: [a_parser] } }
  };
  const incoming = {
    collections: { foo: { class: ColV1, parsers: [a_parser] } }
  };

  merge_env_config(target, incoming);

  t.is(
    target.collections.foo.parsers.length,
    1,
    'parsers array should not duplicate existing function'
  );

  // Add another function to incoming, ensure both are present, no duplicates
  function b_parser () {}
  const target2 = {
    collections: { foo: { class: ColV1, parsers: [a_parser] } }
  };
  const incoming2 = {
    collections: { foo: { class: ColV1, parsers: [a_parser, b_parser] } }
  };
  merge_env_config(target2, incoming2);
  t.deepEqual(
    target2.collections.foo.parsers,
    [a_parser, b_parser],
    'should merge arrays without duplicates and include new items'
  );
});

// Test merging arrays of strings prevents duplicates
test('should merge arrays of strings without duplicates', t => {
  const target = { tags: ['a', 'b'] };
  const incoming = { tags: ['b', 'c', 'd'] };
  const expected = { tags: ['a', 'b', 'c', 'd'] };
  const result = merge_env_config(target, incoming);
  t.deepEqual(
    result,
    expected,
    'strings in arrays should not be duplicated'
  );
});

test('older or same version does NOT replace BUT includes extra props', t => {
  const target = { collections: { foo: { class: ColV2 } } };
  const incoming = { collections: { foo: { class: ColV1, extra: 123 } } };

  merge_env_config(target, incoming);

  t.is(
    target.collections.foo.class,
    ColV2,
    'existing newer class kept'
  );
  t.is(
    target.collections.foo.extra,
    123,
    'older definition merged with no overwrite'
  );
});

test('newer component version replaces older one', t => {
  const old_component = function () {};
  const new_component = function () {};
  new_component.version = 2;
  const target = { components: { test_component: old_component } };
  const incoming = { components: { test_component: new_component } };

  merge_env_config(target, incoming);

  t.is(
    target.components.test_component,
    new_component,
    'newer component replaces older one'
  );
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


test('handles versions components using semver', t => {
  function render_0() {}
  function render_1() {}
  function render_2() {}
  const comp_v1 = { render: render_1, version: '2.0.0' };
  const comp_v2 = { render: render_2, version: '3.0.0' };
  const target = { components: { render: render_0 } };
  const incoming = { components: { render: comp_v1 } };

  merge_env_config(target, incoming);
  t.is(
    target.components.render,
    comp_v1,
    '2.0.0 should replace no-version component'
  );
  const incoming2 = { components: { render: comp_v2 } };
  merge_env_config(target, incoming2);
  t.is(
    target.components.render,
    comp_v2,
    '3.0.0 should replace 2.0.0 component'
  );
});