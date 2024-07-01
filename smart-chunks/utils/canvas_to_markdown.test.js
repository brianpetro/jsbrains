const test = require('ava');
const fs = require('fs');
const path = require('path');
const {canvas_to_markdown} = require('../utils/canvas_to_markdown');

test.before((t) => {
  const canvas = fs.readFileSync(path.join(__dirname, '../test_env/test_canvas.canvas'), 'utf8');
  const markdown = fs.readFileSync(path.join(__dirname, '../test_env/test_canvas.md'), 'utf8').replace(/\r\n/g, '\n');
  t.context = {
    canvas,
    markdown
  };
});

test('should convert canvas to markdown', (t) => {
  const result = canvas_to_markdown(t.context.canvas);
  t.deepEqual(result, t.context.markdown);
});