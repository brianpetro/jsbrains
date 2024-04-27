const test = require('ava');
const { add_content_to_message } = require('../src/add_content_to_message');

test('adds string content to an empty message', t => {
  const curr_msg = {};
  add_content_to_message(curr_msg, 'Hello, world!');
  t.deepEqual(curr_msg, { content: 'Hello, world!' });
});

test('appends string content to existing string content', t => {
  const curr_msg = { content: 'Initial content.' };
  add_content_to_message(curr_msg, ' Appended content.');
  t.is(curr_msg.content, 'Initial content.\nAppended content.');
});

test('handles array content by creating an array if not present', t => {
  const curr_msg = {};
  const content = [{ type: 'text', text: 'First item' }, { type: 'text', text: 'Second item' }];
  add_content_to_message(curr_msg, content);
  t.deepEqual(curr_msg.content, content);
});

test('appends array content to existing array content', t => {
  const curr_msg = { content: [{ type: 'text', text: 'Initial content.' }] };
  const content = [{ type: 'text', text: 'Appended content.' }];
  add_content_to_message(curr_msg, content);
  t.deepEqual(curr_msg.content, [{ type: 'text', text: 'Initial content.' }, ...content]);
});

test('correctly trims and adds string content to existing array content', t => {
  const curr_msg = { content: [{ type: 'text', text: 'Initial content.' }] };
  add_content_to_message(curr_msg, ' Appended content.');
  t.is(curr_msg.content[curr_msg.content.length - 1].text, 'Initial content.\nAppended content.');
});

test('handles escaped markdown code block correctly', t => {
  const curr_msg = {};
  add_content_to_message(curr_msg, '\\```code block');
  t.is(curr_msg.content, '```code block');
});