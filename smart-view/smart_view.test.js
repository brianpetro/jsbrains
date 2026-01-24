import test from 'ava';

import { get_style_sheet_id } from './smart_view.js';

test('get_style_sheet_id returns a stable id for the same input', (t) => {
  const first_id = get_style_sheet_id('body { color: red; }');
  const second_id = get_style_sheet_id('body { color: red; }');

  t.truthy(first_id);
  t.is(first_id, second_id);
  t.true(first_id.startsWith('style-sheet-'));
});

test('get_style_sheet_id changes when css text changes', (t) => {
  const base_id = get_style_sheet_id('body { color: red; }');
  const other_id = get_style_sheet_id('body { color: blue; }');

  t.not(base_id, other_id);
});
