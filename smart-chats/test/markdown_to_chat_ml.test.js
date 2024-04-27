const test = require('ava');
const { markdown_to_chat_ml, } = require('../utils/markdown_to_chat_ml');
const { chat_md, chat_ml } = require('./_env');
test('should convert markdown to chat_ml', (t) => {
  t.deepEqual(markdown_to_chat_ml(chat_md), chat_ml);
});

