import test from 'ava';
import { compare } from './compare.js';

class A {
  constructor(data) {
    this.data = data;
  }
}

test('compares equal_to by default', t => {
  const item_a = new A();
  const result = compare(item_a, item_a);
  t.is(result.item, item_a);
  t.is(result.is_equal, true);
});

test('compares not_equal for different references by default', t => {
  const item_a = new A();
  const item_b = new A();
  const result = compare(item_a, item_b);
  t.is(result.item, item_a);
  t.is(result.is_equal, false);
});

test('supports custom comparison function (by data) - equal', t => {
  const cmpByData = (a, b) => ({ is_equal: a?.data === b?.data });
  const a1 = new A(1);
  const a2 = new A(1);
  const result = compare(a1, a2, cmpByData);
  t.is(result.is_equal, true);
});

test('supports custom comparison function (by data) - not equal', t => {
  const cmpByData = (a, b) => ({ is_equal: a?.data === b?.data });
  const a1 = new A(1);
  const a2 = new A(2);
  const result = compare(a1, a2, cmpByData);
  t.is(result.is_equal, false);
});

test('returns error when compare_fn is not a function', t => {
  const a1 = new A(1);
  const res = compare(a1, new A(1), 'not a fn');
  t.is(res.item, a1);
  t.is(res.error, 'Invalid comparison function');
});

test('returns error when comparison function does not return a result', t => {
  const noResult = () => undefined;
  const a1 = new A(1);
  const res = compare(a1, new A(1), noResult);
  t.is(res.item, a1);
  t.is(res.error, 'Comparison function did not return a result');
});

test('preserves additional properties from comparison function', t => {
  const withMeta = (a, b) => ({ is_equal: a?.data === b?.data, reason: 'by data' });
  const res = compare(new A(2), new A(2), withMeta);
  t.is(res.is_equal, true);
  t.is(res.reason, 'by data');
});

test('passes the correct arguments to the comparison function', t => {
  const a = new A(1);
  const b = new A(2);
  let receivedA, receivedB;
  const spy = (x, y) => {
    receivedA = x;
    receivedB = y;
    return { is_equal: false };
  };
  compare(a, b, spy);
  t.is(receivedA, a);
  t.is(receivedB, b);
});

test('works with primitives using default comparison', t => {
  const res1 = compare(1, 1);
  t.is(res1.is_equal, true);
  const res2 = compare(1, '1');
  t.is(res2.is_equal, false);
});

test('compares against undefined when to_item is missing', t => {
  const a = new A(1);
  const res = compare(a);
  t.is(res.is_equal, false);
});


