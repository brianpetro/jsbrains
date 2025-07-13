import test from 'ava';
import { deep_merge_no_overwrite } from './deep_merge_no_overwrite.js';
import { is_plain_object } from './is_plain_object.js';

test('deep_merge_no_overwrite merges new keys from source to target', (t) => {
  const target = { a: 1 };
  const source = { b: 2, c: 3 };
  deep_merge_no_overwrite(target, source);
  t.deepEqual(target, { a: 1, b: 2, c: 3 }, 'New keys b, c merged onto target');
});

test('deep_merge_no_overwrite does not overwrite existing keys in target', (t) => {
  const target = { a: 1, b: 5 };
  const source = { b: 2, c: 3 };
  deep_merge_no_overwrite(target, source);
  t.is(target.a, 1, 'Key a remains');
  t.is(target.b, 5, 'Existing key b not overwritten');
  t.is(target.c, 3, 'New key c merged');
});

test('deep_merge_no_overwrite merges nested objects without overwriting existing subkeys', (t) => {
  const target = { nested: { existingKey: 'keepMe' } };
  const source = { nested: { existingKey: 'changeMe', newKey: 'added' } };
  deep_merge_no_overwrite(target, source);
  t.is(target.nested.existingKey, 'keepMe', 'existingKey remains intact');
  t.is(target.nested.newKey, 'added', 'New key merged');
});

test('deep_merge_no_overwrite handles repeated source objects for different target keys', (t) => {
  const sharedObj = { x: 10 };
  const target = { alpha: {}, beta: {} };
  const source = { alpha: sharedObj, beta: sharedObj };
  deep_merge_no_overwrite(target, source);
  t.deepEqual(target.alpha, { x: 10 }, 'alpha merges sharedObj');
  t.deepEqual(target.beta, { x: 10 }, 'beta merges sharedObj');
  t.true(target.alpha !== target.beta, 'They are separate sub-objects in target');
});

test('deep_merge_no_overwrite avoids infinite recursion when same (target, source) seen', (t) => {
  // cyc reference
  const objA = {};
  const objB = { refA: objA };
  objA.refB = objB;

  const target = {};
  const source = { cycRoot: objA };

  t.notThrows(() => {
    deep_merge_no_overwrite(target, source);
  }, 'Does not infinitely recurse');
  t.truthy(target.cycRoot, 'Merged cycRoot from source');
});

test('is_plain_object checks for simple object types', (t) => {
  t.true(is_plain_object({}), 'plain object returns true');
  t.false(is_plain_object([]), 'array returns false');
  t.false(is_plain_object(() => {}), 'function returns false');
  t.false(is_plain_object(null), 'null returns false');
  t.false(is_plain_object(new Date()), 'Date object returns false');
});

test('deep_merge_no_overwrite handles deeply nested objects', (t) => {
  const target = {
    a: {
      b: {
        c: {
          d: 'existing',
        },
      },
    },
  };
  const source = {
    a: {
      b: {
        c: {
          e: 'new',
        },
      },
    },
  };

  deep_merge_no_overwrite(target, source);
  t.is(target.a.b.c.d, 'existing', 'existing key d remains');
  t.is(target.a.b.c.e, 'new', 'new key e merged');
});

test('should handle merging array of functions', (t) => {
  const parse_links = () => {};
  const parse_blocks = () => {};
  const target = {
    a: {
      b: {
        content_parsers: [parse_links],
      },
    },
  };
  const source = {
    a: {
      b: {
        content_parsers: [parse_blocks],
      },
    },
  };
  deep_merge_no_overwrite(target, source);
  t.deepEqual(target.a.b.content_parsers, [parse_links, parse_blocks], 'content_parsers merged');
});

test('merging array of functions prevents duplicates', (t) => {
  const parse_blocks = () => {};
  const target = {
    a: {
      b: {
        content_parsers: [parse_blocks],
      },
    },
  };
  const source = {
    a: {
      b: {
        content_parsers: [parse_blocks],
      },
    },
  };
  deep_merge_no_overwrite(target, source);
  t.deepEqual(target.a.b.content_parsers, [parse_blocks], 'content_parsers merged');
});

// Prevent duplicate primitive values when merging arrays
test('merging array of primitives prevents duplicates', (t) => {
  const target = { arr: [1, 2, 3] };
  const source = { arr: [2, 3, 4, 5] };
  deep_merge_no_overwrite(target, source);
  t.deepEqual(target.arr, [1, 2, 3, 4, 5], 'No duplicate primitives in merged array');
});