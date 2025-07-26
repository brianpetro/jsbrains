import test from 'ava';
import { get_by_path } from './get_by_path.js';

test('get_by_path retrieves nested value', t => {
  const obj = { a: { b: { c: 5 } } };
  t.is(get_by_path(obj, 'a.b.c'), 5);
});

test('get_by_path binds functions', t => {
  const obj = { a: { fn(){ return this; } } };
  const bound = get_by_path(obj, 'a.fn');
  t.is(bound(), obj.a);
});

test('get_by_path with scope prefix', t => {
  const obj = { settings: { val: 1 } };
  t.is(get_by_path(obj, 'val', 'settings'), 1);
});
