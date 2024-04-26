const test = require('ava');
const { chatml_to_cohere } = require('./cohere');

test('reformats chatml to cohere format', (t) => {
  const input = {
    model: 'command-r',
    messages: [
      { role: 'system', content: 'System message' },
      { role: 'user', content: 'User message' },
      { role: 'assistant', content: 'Assistant message' },
      { role: 'user', content: 'User message 2' }
    ],
    temperature: 0.5,
    topK: 10,
    topP: 0.8,
    max_tokens: 100,
    stopSequences: ['stop'],
    n: 2
  };
  const expected = {
    model: 'command-r',
    chat_history: [
      { role: 'system', message: 'System message' },
      { role: 'user', message: 'User message' },
      { role: 'assistant', message: 'Assistant message' },
    ],
    message: 'User message 2',
    temperature: 0.5,
  };

  const cohere = chatml_to_cohere(input);
  t.deepEqual(cohere, expected);
});
test('handles message content as an array', (t) => {
  const input = {
    model: 'command-r',
    messages: [
      { role: 'system', content: 'System message' },
      { role: 'user', content: [ { type: 'text', text: 'User message' } ]},
      { role: 'assistant', content: [ { type: 'text', text: 'Assistant message' } ]},
      { role: 'user', content: [ { type: 'text', text: 'User message 2' } ]}
    ],
    temperature: 0.5,
    topK: 10,
    topP: 0.8,
    max_tokens: 100,
    stopSequences: ['stop'],
    n: 2
  };
  const expected = {
    model: 'command-r',
    chat_history: [
      { role: 'system', message: 'System message' },
      { role: 'user', message: 'User message' },
      { role: 'assistant', message: 'Assistant message' },
    ],
    message: 'User message 2',
    temperature: 0.5,
  };

  const cohere = chatml_to_cohere(input);
  t.deepEqual(cohere, expected);
});