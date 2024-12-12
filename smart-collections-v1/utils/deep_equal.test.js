import test from 'ava';
import { deep_equal } from './deep_equal.js';

test('deep_equal handles primitive values', t => {
  // Same values
  t.true(deep_equal(1, 1), 'numbers should be equal');
  t.true(deep_equal('hello', 'hello'), 'strings should be equal');
  t.true(deep_equal(true, true), 'booleans should be equal');
  t.true(deep_equal(null, null), 'null values should be equal');
  t.true(deep_equal(undefined, undefined), 'undefined values should be equal');

  // Different values
  t.false(deep_equal(1, 2), 'different numbers should not be equal');
  t.false(deep_equal('hello', 'world'), 'different strings should not be equal');
  t.false(deep_equal(true, false), 'different booleans should not be equal');
  t.false(deep_equal(null, undefined), 'null and undefined should not be equal');
});

test('deep_equal handles simple objects', t => {
  t.true(deep_equal({}, {}), 'empty objects should be equal');
  t.true(deep_equal(
    { a: 1, b: 2 },
    { a: 1, b: 2 }
  ), 'objects with same properties should be equal');
  
  t.false(deep_equal(
    { a: 1, b: 2 },
    { a: 1, b: 3 }
  ), 'objects with different values should not be equal');
  
  t.false(deep_equal(
    { a: 1, b: 2 },
    { a: 1 }
  ), 'objects with different number of properties should not be equal');
});

test('deep_equal handles nested objects', t => {
  t.true(deep_equal(
    { a: { b: 1 }, c: { d: 2 } },
    { a: { b: 1 }, c: { d: 2 } }
  ), 'nested objects with same structure should be equal');

  t.false(deep_equal(
    { a: { b: 1 }, c: { d: 2 } },
    { a: { b: 1 }, c: { d: 3 } }
  ), 'nested objects with different values should not be equal');
});

test('deep_equal handles arrays', t => {
  t.true(deep_equal([], []), 'empty arrays should be equal');
  t.true(deep_equal([1, 2, 3], [1, 2, 3]), 'arrays with same elements should be equal');
  t.true(deep_equal(
    [{ a: 1 }, { b: 2 }],
    [{ a: 1 }, { b: 2 }]
  ), 'arrays of objects with same structure should be equal');

  t.false(deep_equal([1, 2, 3], [1, 2, 4]), 'arrays with different elements should not be equal');
  t.false(deep_equal([1, 2], [1, 2, 3]), 'arrays with different lengths should not be equal');
});

test('deep_equal handles mixed nested structures', t => {
  t.true(deep_equal(
    { a: [1, { b: 2 }], c: { d: [3, 4] } },
    { a: [1, { b: 2 }], c: { d: [3, 4] } }
  ), 'complex nested structures should be equal');

  t.false(deep_equal(
    { a: [1, { b: 2 }], c: { d: [3, 4] } },
    { a: [1, { b: 2 }], c: { d: [3, 5] } }
  ), 'complex nested structures with different values should not be equal');
});

test('deep_equal handles edge cases', t => {
  t.false(deep_equal({}, null), 'object and null should not be equal');
  t.false(deep_equal(null, {}), 'null and object should not be equal');
  t.false(deep_equal(undefined, {}), 'undefined and object should not be equal');
  t.false(deep_equal({}, undefined), 'object and undefined should not be equal');
  t.false(deep_equal([], {}), 'array and empty object should not be equal');
  t.false(deep_equal({}, []), 'empty object and array should not be equal');
});

test('deep_equal handles circular references', t => {
  const obj1 = { a: 1 };
  const obj2 = { a: 1 };
  obj1.self = obj1;
  obj2.self = obj2;

  t.true(deep_equal(obj1, obj2), 'objects with circular references should be equal');
}); 