const test = require('ava');
const { is_list_item } = require('./is_list_item');

test('is_list_item recognizes unordered list items', t => {
  t.true(is_list_item('- item'));
  t.true(is_list_item('* item'));
  t.true(is_list_item('+ item'));
});

test('is_list_item recognizes task list items', t => {
  t.true(is_list_item('- [ ] unchecked item'));
  t.true(is_list_item('- [x] checked item'));
});

test('is_list_item recognizes ordered list items', t => {
  t.true(is_list_item('1. item'));
  t.true(is_list_item('2) item'));
  t.true(is_list_item('3. item'));
});

test('is_list_item returns false for non-list items', t => {
  t.false(is_list_item('Just a normal line'));
  t.false(is_list_item('# Not a list item'));
  t.false(is_list_item(''));
});

test('is_list_item handles leading spaces correctly', t => {
  t.true(is_list_item('  - item'));
  t.true(is_list_item('   * item'));
  t.true(is_list_item('    + item'));
  t.true(is_list_item('     1. item'));
  t.true(is_list_item('      2) item'));
  t.false(is_list_item('       Just a normal line'));
});