const { SmartMarkdown } = require('../SmartMarkdown');
// const { MarkdownAdapter } = require('./markdown');
const { SmartChunks } = require('../smart_chunks');
const fs = require('fs');
const path = require('path');
const test = require('ava');
const expected = require('../test_env/test_markdown.json');

test.before(async t => {
  const md = fs.readFileSync(path.join(__dirname, '../test_env/test_markdown.md'), 'utf8');
  const env = {};
  const mock_entity = {
    get_content: async () => md,
    file_path: 'test_env/test_markdown.md'
  };
  const opts = {adapter: 'markdown'};
  const smart_chunks = new SmartChunks(env, opts);
  t.context = {
    md,
    mock_entity,
    env,
    opts,
    smart_chunks,
    expected
  }
});
const TEST_TIMES = 100;
test.serial('v1 should return the expected blocks', t => {
  const parsed = (new SmartMarkdown({})).parse({content: t.context.md, file_path: t.context.mock_entity.file_path});
  // fs.writeFileSync(path.join(__dirname, '../test_env/test_markdown.json'), JSON.stringify(parsed, null, 2));
  t.deepEqual(parsed.blocks, t.context.expected.blocks);
  const start = new Date();
  // run ten times
  for (let i = 0; i < TEST_TIMES; i++) {
    (new SmartMarkdown({})).parse({content: t.context.md, file_path: t.context.mock_entity.file_path});
  }
  const end = new Date();
  console.log(`Time taken (old): ${end - start}ms`);
});
test.serial('should return the expected blocks', async t => {
  const parsed = await t.context.smart_chunks.parse(t.context.mock_entity);
  t.deepEqual(parsed.blocks, t.context.expected.blocks);
  const start = new Date();
  for (let i = 0; i < TEST_TIMES; i++) {
    await t.context.smart_chunks.parse(t.context.mock_entity);
  }
  const end = new Date();
  console.log(`Time taken (new): ${end - start}ms`);
});


