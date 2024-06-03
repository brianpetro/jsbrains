const test = require('ava');
const { MarkdownAdapter } = require("../adapters/markdown");
const { is_end_of_block } = require("../utils/is_end_of_block");

const test_md = `Start
is end of block
# Heading 1
Not end of block
Content 1

- List item
  - not end of block
  - not end of block
  - is end of block
- is end of block
- not end of block
  - not end of block
  - is end of block
- not end of block
- not end of block
- not end of block
- is end of block
300+ char line parsed to single block lorem ipsum dolor sit amet consectetur adipiscing elit... lorem ipsum dolor sit amet consectetur adipiscing elit... lorem ipsum dolor sit amet consectetur adipiscing elit... lorem ipsum dolor sit amet consectetur adipiscing elit... lorem ipsum dolor sit amet consectetur adipiscing elit...
not end of block
is end of block
---
not end of block
is end of block`;


test('is_end_of_block should return end of block', async t => {
  const lines = test_md.split('\n');
  t.true(is_end_of_block(lines, 1, MarkdownAdapter.defaults), lines[1]);
  t.true(is_end_of_block(lines, 9, MarkdownAdapter.defaults), lines[9]);
  t.true(is_end_of_block(lines, 10, MarkdownAdapter.defaults), lines[10]);
  t.true(is_end_of_block(lines, 13, MarkdownAdapter.defaults), lines[13]);
  t.false(is_end_of_block(lines, 14, MarkdownAdapter.defaults), lines[14]);
  t.false(is_end_of_block(lines, 15, MarkdownAdapter.defaults), lines[15]);
  t.true(is_end_of_block(lines, 17, MarkdownAdapter.defaults), lines[17]);
  t.true(is_end_of_block(lines, 18, MarkdownAdapter.defaults), lines[18]);
  t.true(is_end_of_block(lines, 20, MarkdownAdapter.defaults), lines[20]);
  t.true(is_end_of_block(lines, 23, MarkdownAdapter.defaults), lines[23]);
});