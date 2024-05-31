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
  const parsed = await smart_chunks.parse(mock_entity);
  t.context = {
    md,
    mock_entity,
    env,
    opts,
    smart_chunks,
    parsed,
    expected
  }
});
test('v1 should return the expected blocks', t => {
  const parsed = (new SmartMarkdown({})).parse({content: t.context.md, file_path: t.context.mock_entity.file_path});
  t.deepEqual(parsed.blocks, t.context.expected.blocks);
});
test('should return the expected blocks', t => {
  t.deepEqual(t.context.parsed.blocks, t.context.expected.blocks);
});


