import test from 'ava';
import { set_by_path } from './set_by_path.js';

 test('set_by_path creates nested structure', t => {
  const obj = {};
  set_by_path(obj, 'a.b.c', 5);
  t.is(obj.a.b.c, 5);
});

test('set_by_path with scope prefix', t => {
  const obj = { settings: {} };
  set_by_path(obj, 'd.e', 3, 'settings');
  t.is(obj.settings.d.e, 3);
});
