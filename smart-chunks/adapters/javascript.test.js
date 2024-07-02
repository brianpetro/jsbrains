const test = require('ava');
const { SmartChunks } = require('../smart_chunks');
const fs = require('fs');
const path = require('path');

test.before((t) => {
  const jsContent = fs.readFileSync(path.join(__dirname, '../test_env/test_js_input.js'), 'utf8');
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, '../test_env/test_js_output.json'), 'utf8'));
  const env = {};
  const opts = {adapter: 'javascript'};
  const smart_chunks = new SmartChunks(env, opts);
  t.context = {
    smart_chunks,
    jsContent,
    expected
  };
});

test('should parse JavaScript', async (t) => {
  const result = await t.context.smart_chunks.parse({
    get_content: async () => t.context.jsContent,
    file_path: 'test_env/test_js_input.js',
  }, {adapter: 'javascript'});
  // fs.writeFileSync(path.join(__dirname, '../test_env/expected_output.json'), JSON.stringify(result, null, 2));
  t.deepEqual(result.blocks, t.context.expected.blocks);
});