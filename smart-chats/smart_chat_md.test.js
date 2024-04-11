const test = require('ava');
const {
  chat_ml_to_markdown,
  markdown_to_chat_ml,
} = require('./smart_chat_md');

const chat_ml = {messages: [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there!' },
  { role: 'system', content: '```sc-context\ntest1.md\ntest2.md\n```' },
  { role: 'user', content: 'Who am I?' },
  { role: 'user', content: 'What is 2 + 2?' },
  { role: 'assistant', tool_calls: [{ id: 'calc', type: 'function', function: { name: 'calc', arguments: '{"sum":[2,2]}' } }] },
  { role: 'tool', tool_call_id: 'calc', content: '4' },
  { role: 'assistant', content: 'The answer is 4' },
  { role: 'user', content: 'Thanks' },
]};
const chat_md = `
##### user
Hello

##### assistant
Hi there!

##### system
\`\`\`sc-context
test1.md
test2.md
\`\`\`

##### user
Who am I?

##### user
What is 2 + 2?

##### assistant
\`\`\`calc
{"sum":[2,2]}
\`\`\`

##### tool
\`\`\`calc
4
\`\`\`

##### assistant
The answer is 4

##### user
Thanks
`.trim();
test('chat_ml_to_markdown', (t) => {
  t.is(chat_ml_to_markdown(chat_ml), chat_md);
});
test('markdown_to_chat_ml', (t) => {
  t.deepEqual(markdown_to_chat_ml(chat_md), chat_ml);
});