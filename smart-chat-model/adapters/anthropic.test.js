const test = require('ava');
const { chatml_to_anthropic } = require('./anthropic');

test('filters out system messages and formats correctly', t => {
  const input = {
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
      { role: 'user', content: 'How are you?' }
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5
  };

  const expected = {
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
      { role: 'user', content: 'How are you?' }
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5
  };

  const result = chatml_to_anthropic(input);
  t.deepEqual(result, expected);
});

test('adds system message context correctly', t => {
  const input = {
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'system', content: '---BEGIN NOTE---\nImportant info\n---END NOTE---' },
      { role: 'user', content: 'How are you?' }
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5
  };

  const expectedContent = '<context>\n---BEGIN NOTE---\nImportant info\n---END NOTE---\n</context>\nHow are you?';
  const result = chatml_to_anthropic(input);

  t.is(result.messages[result.messages.length - 1].content, expectedContent);
});

const anthropic_lookup = {
  "name": "lookup",
  "description": "Semantic search",
  "input_schema": {
    "type": "object",
    "properties": {
      "hypotheticals": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["hypotheticals"]
  }
};
const anthropic_create_note = {
  "name": "create_note",
  "description": "Create a note",
  "input_schema": {
    "type": "object",
    "properties": {
      "note": {
        "type": "string"
      }
    },
    "required": ["note"]
  }
};
const openai_lookup = {
  "type": "function",
  "function": {
    "name": "lookup",
    "description": "Semantic search",
    "parameters": {
      "type": "object",
      "properties": {
        "hypotheticals": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "required": ["hypotheticals"]
    }
  }
};
const openai_create_note = {
  "type": "function",
  "function": {
    "name": "create_note",
    "description": "Create a note",
    "parameters": {
      "type": "object",
      "properties": {
        "note": {
          "type": "string"
        }
      },
      "required": ["note"]
    }
  }
};
test('should handle tool_choice forcing lookup', t => {
  const input = {
    messages: [
      { role: 'user', content: 'Hello' },
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5,
    tool_choice: {
      type: "function",
      function: {
        name: "lookup",
      }
    },
    tools: [openai_lookup]
  };
  const expected = {
    messages: [
      { role: 'user', content: 'Hello\nUse the "lookup" tool!' },
    ],
    model: 'test-model',
    system: 'Required: use the "lookup" tool!',
    max_tokens: 100,
    temperature: 0.5,
    tools: [anthropic_lookup]
  };
  t.deepEqual(chatml_to_anthropic(input), expected);
});
test('should handle tool_choice auto', t => {
  const input = {
    messages: [
      { role: 'user', content: 'Hello' },
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5,
    tool_choice: "auto",
    tools: [openai_lookup, openai_create_note]
  };
  const expected = {
    messages: [
      { role: 'user', content: 'Hello' },
    ],
    model: 'test-model',
    // system: 'Required: use the "lookup" tool!',
    max_tokens: 100,
    temperature: 0.5,
    tools: [anthropic_lookup, anthropic_create_note]
  };
  t.deepEqual(chatml_to_anthropic(input), expected);
});
test('should properly format tool role as tool result in user message', t => {
  const input = {
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', "tool_calls": [
        {
          "id": "check_status",
          "type": "function",
          "function": {
            "name": "check_status",
            "arguments": "{\"status\":\"check\"}"
          }
        }
      ]},
      { role: 'tool', content: '{"result": "ok"}' },
      { 
        role: 'assistant',
        content: [
          { type: 'text', text: 'The result of the lookup tool was: OK; checking again' },
        ],
        tool_calls: [
          {
            id: 'check_status',
            type: 'function',
            function: {
              name: 'check_status',
              arguments: '{"status":"check2"}'
            }
          }
        ]
      },
      { role: 'tool', content: '{"result": "ok2"}' },
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5,
  };
  const expected = {
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: [
        { type: 'tool_use', id: 'tool-1', name: 'check_status', input: {"status": "check"} }
      ]},
      { role: 'user', content: [
        {
          type: 'tool_result',
          tool_use_id: 'tool-1',
          content: '{"result": "ok"}'
        }
      ]},
      { role: 'assistant', content: [
        { type: 'tool_use', id: 'tool-2', name: 'check_status', input: {"status": "check2"} },
        { type: 'text', text: 'The result of the lookup tool was: OK; checking again' },
      ]},
      { role: 'user', content: [
        {
          type: 'tool_result',
          tool_use_id: 'tool-2',
          content: '{"result": "ok2"}'
        }
      ]}
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5,
  };
  t.deepEqual(chatml_to_anthropic(input), expected);
});

test('adds non-context system message correctly', t => {
  const input = {
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'system', content: 'Respond as if you are a helpful assistant' },
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5
  };

  const expected = {
    messages: [
      { role: 'user', content: 'Hello' },
    ],
    system: 'Respond as if you are a helpful assistant',
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5
  };

  const result = chatml_to_anthropic(input);
  t.deepEqual(result, expected);
});

test('handles message content as an array', t => {
  const input = {
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: "Hello"
          }
        ]
      },
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Hi!'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'How are you?'
          }
        ]
      }
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5
  };


  const expected = {
    messages: [
      { role: 'user', content: [{type: 'text', text: 'Hello'}] },
      { role: 'assistant', content: [{type: 'text', text: 'Hi!'}] },
      { role: 'user', content: [{type: 'text', text: 'How are you?'}] }
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5
  };


  const result = chatml_to_anthropic(input);
  t.deepEqual(result, expected);
});

test('should handle image_url', t => {
  const input = {
    messages: [
      { role: 'user', content: [
        {type: 'text', text: 'Transcribe this image' },
        {type: 'image_url', image_url: {url: 'data:image/jpg;base64,Base64 image'}}
      ]}
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5
  };
  const expected = {
    messages: [
      { role: 'user', content: [
        {type: 'text', text: 'Transcribe this image'},
        {type: 'image', source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: 'Base64 image'
        }}
      ]}
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5
  };
  t.deepEqual(chatml_to_anthropic(input), expected);
})

