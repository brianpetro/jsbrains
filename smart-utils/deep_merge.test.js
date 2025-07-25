import test from 'ava';
import { deep_merge } from './deep_merge.js';

test('deep_merge merges objects deeply', t => {
  const a = { a: 1, b: { c: 2 } };
  const b = { b: { d: 3 } };
  deep_merge(a, b);
  t.deepEqual(a, { a: 1, b: { c: 2, d: 3 } });
});

test('should correctly merge two objects', t => {
  const obj1 = { a: 1, b: { c: 2 } };
  const obj2 = { b: { d: 3 }, e: 4 };
  const expected = { a: 1, b: { c: 2, d: 3 }, e: 4 };

  const result = deep_merge(obj1, obj2);

  t.deepEqual(result, expected);
});

test('should overwrite existing properties', t => {
  const obj1 = { a: 1, b: { c: 2, d: 3 } };
  const obj2 = { a: 2, b: { c: 3 } };
  const expected = { a: 2, b: { c: 3, d: 3 } };

  const result = deep_merge(obj1, obj2);

  t.deepEqual(result, expected);
});

test('should handle nested objects correctly', t => {
  const obj1 = { a: { b: { c: 1 } } };
  const obj2 = { a: { b: { d: 2 }, e: 3 }, f: 4 };
  const expected = { a: { b: { c: 1, d: 2 }, e: 3 }, f: 4 };

  const result = deep_merge(obj1, obj2);

  t.deepEqual(result, expected);
});

test('should not modify the existing object structure when new_obj is empty', t => {
  const obj1 = { a: 1, b: { c: 2 } };
  const obj2 = {};
  const expected = { a: 1, b: { c: 2 } };

  const result = deep_merge(obj1, obj2);

  t.deepEqual(result, expected);
});


test("should deep merge nested object a.b.c.d.e", t => {
  const obj1 = { a: { b: { c: { d: { e: 1 } } } }, f: 1 };
  const obj2 = { a: { b: { c: { d: { e: 2 } } } } };
  const expected = { a: { b: { c: { d: { e: 2 } } } }, f: 1 };

  const result = deep_merge(obj1, obj2);

  t.deepEqual(result, expected);
})
