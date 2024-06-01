const { SmartMarkdown } = require('../SmartMarkdown');
// get win or mac
const platform = process.platform === 'win32' ? 'win' : 'mac';

// const { MarkdownAdapter } = require('./markdown');
const { SmartChunks } = require('../smart_chunks');
const fs = require('fs');
const path = require('path');
const test = require('ava');
const expected_v1 = require(`../test_env/test_markdown_v1_${platform}.json`); // ensures backwards compatibility
const expected_v2 = require(`../test_env/test_markdown_v2_${platform}.json`); // implements new features

test.before(async t => {
  const md_v1 = fs.readFileSync(path.join(__dirname, '../test_env/test_markdown_v1.md'), 'utf8');
  const md_v2 = fs.readFileSync(path.join(__dirname, '../test_env/test_markdown_v2.md'), 'utf8');
  const env = {};
  // mock_entity_v1 is the old way of doing things
  const mock_entity_v1 = {
    get_content: async () => md_v1,
    file_path: 'test_env/test_markdown_v1.md'
  };
  // mock_entity_v2 is the new way of doing things
  const mock_entity_v2 = {
    get_content: async () => md_v2,
    file_path: 'test_env/test_markdown_v2.md'
  };
  const opts = {adapter: 'markdown'};
  const smart_chunks = new SmartChunks(env, opts);
  t.context = {
    md_v1,
    md_v2,
    mock_entity_v1,
    mock_entity_v2,
    env,
    opts,
    smart_chunks,
    expected_v1,
    expected_v2
  }
});
const TEST_TIMES = 100;
test.serial('SmartMarkdown (v1) should return the expected v1 blocks', t => {
  const parsed = (new SmartMarkdown({})).parse({content: t.context.md_v1, file_path: t.context.mock_entity_v1.file_path});
  // fs.writeFileSync(path.join(__dirname, `../test_env/test_markdown_v1_${platform}.json`), JSON.stringify(parsed, null, 2));
  t.deepEqual(parsed.blocks, t.context.expected_v1.blocks);
  const start = new Date();
  // run ten times
  for (let i = 0; i < TEST_TIMES; i++) {
    (new SmartMarkdown({})).parse({content: t.context.md_v1, file_path: t.context.mock_entity_v1.file_path});
  }
  const end = new Date();
  console.log(`Time taken (old): ${end - start}ms`);
});
test.serial('SmartChunks (MarkdownAdapter) should return the expected v1 blocks', async t => {
  const parsed = await t.context.smart_chunks.parse(t.context.mock_entity_v1);
  t.deepEqual(parsed.blocks, t.context.expected_v1.blocks);
  const start = new Date();
  for (let i = 0; i < TEST_TIMES; i++) {
    await t.context.smart_chunks.parse(t.context.mock_entity_v1);
  }
  const end = new Date();
  console.log(`Time taken (new): ${end - start}ms`);
});
// test the new features
test.serial('SmartChunks (MarkdownAdapter) should return the expected v2 blocks', async t => {
  const parsed = await t.context.smart_chunks.parse(t.context.mock_entity_v2);
  // fs.writeFileSync(path.join(__dirname, `../test_env/test_markdown_v2_${platform}.json`), JSON.stringify(parsed, null, 2));
  t.deepEqual(parsed.blocks, t.context.expected_v2.blocks);
  // const start = new Date();
  // for (let i = 0; i < TEST_TIMES; i++) {
  //   await t.context.smart_chunks.parse(t.context.mock_entity_v2);
  // }
  // const end = new Date();
  // console.log(`Time taken (new): ${end - start}ms`);
});

const {is_end_of_block} = require('../adapters/markdown');
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
- is end of block`;
test('is_end_of_block should return end of block', async t => {
  const lines = test_md.split('\n');
  t.true(is_end_of_block(lines, 1));
  t.true(is_end_of_block(lines, 9));
  t.true(is_end_of_block(lines, 10));
  t.true(is_end_of_block(lines, 13));
  t.false(is_end_of_block(lines, 14));
  t.false(is_end_of_block(lines, 15));
  t.true(is_end_of_block(lines, 16));
});
