const test = require('ava');
const { SmartChunks } = require('../smart_chunks');
const fs = require('fs');
const path = require('path');

test.before(async (t) => {
  const js_content = fs.readFileSync(path.join(__dirname, '../test_env/test_js.js'), 'utf8');
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, '../test_env/test_js.json'), 'utf8'));
  const env = {};
  const opts = {adapter: 'javascript'};
  const smart_chunks = new SmartChunks(env, opts);
  const result = await smart_chunks.parse({
    get_content: async () => js_content,
    file_path: 'test_env/test_js.js',
  }, {adapter: 'javascript'});
  t.context = {
    smart_chunks,
    js_content,
    expected,
    result
  };
});

test('should parse class path', (t) => {
  t.is(t.context.result.blocks[0].path, t.context.expected.blocks[0].path);
});
test('should parse add function path', (t) => {
  t.is(t.context.result.blocks[1].path, t.context.expected.blocks[1].path);
});
test('should parse subtract function path', (t) => {
  t.is(t.context.result.blocks[2].path, t.context.expected.blocks[2].path);
});

test('should parse class lines (first line includes comments prior to the code block)', (t) => {
  t.deepEqual(t.context.result.blocks[0].lines, t.context.expected.blocks[0].lines);
});
test('should parse add function lines (first line includes comments prior to the code block)', (t) => {
  t.deepEqual(t.context.result.blocks[1].lines, t.context.expected.blocks[1].lines);
});
test('should parse subtract function lines (first line includes comments prior to the code block)', (t) => {
  t.deepEqual(t.context.result.blocks[2].lines, t.context.expected.blocks[2].lines);
});

test('should parse text for class block', (t) => {
  const expected_text = t.context.js_content.split('\n').slice(t.context.expected.blocks[0].lines[0]-1, t.context.expected.blocks[0].lines[1]).join('\n');
  t.is(t.context.result.blocks[0].text, expected_text);
});
test('should parse text for add function block', (t) => {
  const expected_text = t.context.js_content.split('\n').slice(t.context.expected.blocks[1].lines[0]-1, t.context.expected.blocks[1].lines[1]).join('\n');
  t.is(t.context.result.blocks[1].text, expected_text);
});
test('should parse text for subtract function block', (t) => {
  const expected_text = t.context.js_content.split('\n').slice(t.context.expected.blocks[2].lines[0]-1, t.context.expected.blocks[2].lines[1]).join('\n');
  t.is(t.context.result.blocks[2].text, expected_text);
});