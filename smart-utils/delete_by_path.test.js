import test from 'ava';
import { delete_by_path } from './delete_by_path.js';

 test('delete_by_path removes value', t => {
  const obj = { a: { b: 4 } };
  delete_by_path(obj, 'a.b');
  t.deepEqual(obj, { a: {} });
});

test('delete_by_path with scope prefix', t => {
  const obj = { settings: { x: 2 } };
  delete_by_path(obj, 'x', 'settings');
  t.deepEqual(obj.settings, {});
});
