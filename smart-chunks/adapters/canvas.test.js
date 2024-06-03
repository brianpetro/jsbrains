const test = require('ava');
const { SmartChunks } = require('../smart_chunks');
const fs = require('fs');
const path = require('path');

test.before((t) => {
  const canvas = fs.readFileSync(path.join(__dirname, '../test_env/test_canvas.canvas'), 'utf8');
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, '../test_env/test_canvas.json'), 'utf8'));
  const smart_chunks = new SmartChunks();
  t.context = {
    smart_chunks,
    canvas,
    expected
  }
});

test('should parse canvas', async (t) => {
  const result = await t.context.smart_chunks.parse({
    get_content: async () => t.context.canvas,
    file_path: 'test_env/test_canvas.canvas',
  }, {adapter: 'canvas'});
  // fs.writeFileSync(path.join(__dirname, '../test_env/test_canvas.json'), JSON.stringify(result, null, 2));
  t.deepEqual(result.blocks, t.context.expected.blocks);
});
