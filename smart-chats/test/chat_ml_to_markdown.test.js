const test = require('ava');
const { chat_ml_to_markdown, } = require('../src/chat_ml_to_markdown');
const { chat_md, chat_ml } = require('./_env');
test('should convert chat_ml to markdown', (t) => {
  t.is(chat_ml_to_markdown(chat_ml), chat_md);
});