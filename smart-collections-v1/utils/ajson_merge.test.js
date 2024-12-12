import test from 'ava';
import { ajson_merge } from './ajson_merge.js';

test('should correctly merge two objects', t => {
  const obj1 = { a: 1, b: { c: 2 } };
  const obj2 = { b: { d: 3 }, e: 4 };
  const expected = { a: 1, b: { c: 2, d: 3 }, e: 4 };

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
});

test('should overwrite existing properties', t => {
  const obj1 = { a: 1, b: { c: 2, d: 3 } };
  const obj2 = { a: 2, b: { c: 3 } };
  const expected = { a: 2, b: { c: 3, d: 3 } };

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
});

test('should handle nested objects correctly', t => {
  const obj1 = { a: { b: { c: 1 } } };
  const obj2 = { a: { b: { d: 2 }, e: 3 }, f: 4 };
  const expected = { a: { b: { c: 1, d: 2 }, e: 3 }, f: 4 };

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
});

test('should not modify the existing object structure when new_obj is empty', t => {
  const obj1 = { a: 1, b: { c: 2 } };
  const obj2 = {};
  const expected = { a: 1, b: { c: 2 } };

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
});

test("should deep merge nested object a.b.c.d.e", t => {
  const obj1 = { a: { b: { c: { d: { e: 1 } } } }, f: 1 };
  const obj2 = { a: { b: { c: { d: { e: 2 } } } } };
  const expected = { a: { b: { c: { d: { e: 2 } } } }, f: 1 };

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
})

test("should deep merge nested objects with arrays", t => {
  const obj1 = { a: { b: { c: {vec: [1,2,3]} } } };
  const obj2 = { a: { b: { d: {vec: [4,5,6]} } } };
  const expected = { a: { b: { c: {vec: [1,2,3]}, d: {vec: [4,5,6]} } } };

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
})

test("empty object should not overwrite existing object", t => {
  const obj1 = { a: { b: { c: {vec: [1,2,3]} } } };
  const obj2 = {a: {b: {c: {} } } };
  const expected = { a: { b: { c: {vec: [1,2,3]} } } };

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
})

test("new array should not overwrite existing array", t => {
  const obj1 = { a: { b: { c: {vec: [1,2,3]} } } };
  const obj2 = {a: {b: {c: {vec: [4,5,6]} } } };
  const expected = { a: { b: { c: {vec: [4,5,6]} } } };

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
})

test("null should overwrite existing object", t => {
  const obj1 = { a: { b: { c: {vec: [1,2,3]} } } };
  const obj2 = null;
  const expected = null;

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
})
test("undefined should not overwrite existing object", t => {
  const obj1 = { a: { b: { c: {vec: [1,2,3]} } } };
  const obj2 = undefined;
  const expected = { a: { b: { c: {vec: [1,2,3]} } } };

  const result = ajson_merge(obj1, obj2);

  t.deepEqual(result, expected);
})