const test = require('ava');
const { chatml_to_gemini } = require('./gemini');
const safetySettings = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_NONE"
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_NONE"
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_NONE"
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_NONE"
  }
];
const generationConfig = {
  temperature: 0.9,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
  stopSequences: [],
  candidate_count: 1,
};

test('converts chatML to Gemini format with system message merged', t => {
  const input = {
    messages: [
      { role: 'system', content: 'Write like a leprechaun' },
      { role: 'system', content: '---BEGIN NOTE---\nSystem message\n---END NOTE---' },
      { role: 'user', content: 'User message' }
    ],
    temperature: 0.5,
    topK: 10,
    topP: 0.8,
    max_tokens: 100,
    stopSequences: ['stop'],
    n: 2
  };
  const expected = {
    contents: [
      {
        role: 'user',
        parts: [{ text: '---BEGIN IMPORTANT CONTEXT---\n---BEGIN NOTE---\nSystem message\n---END NOTE---\n---END IMPORTANT CONTEXT---\n\nUser message' }]
      }
    ],
    generationConfig: {
      ...generationConfig,
      temperature: 0.5,
      maxOutputTokens: 100,
      stopSequences: ['stop'],
      candidate_count: 2,
      topK: 10,
      topP: 0.8
    },
    safetySettings,
    systemInstruction: { parts: [{ text: 'Write like a leprechaun' }] }
  };
  const result = chatml_to_gemini(input);
  t.deepEqual(result, expected);
});

test('handles input without system messages correctly', t => {
  const input = {
    messages: [
      { role: 'user', content: 'User message' }
    ],
    temperature: 0.5
  };
  const expected = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'User message' }]
      }
    ],
    generationConfig: {...generationConfig, temperature: 0.5},
    safetySettings
  };
  const result = chatml_to_gemini(input);
  t.deepEqual(result, expected);
});


test('should handle tools', t => {
  const input = {
    messages: [
      { role: 'user', content: 'Hello' },
    ],
    model: 'test-model',
    max_tokens: 100,
    temperature: 0.5,
    tools: [{
      "type": "function",
      "function": {
        "name": "lookup",
        "description": "Semantic search",
        "parameters": {
          "type": "object",
          "properties": {
            "hypotheticals": {
              "type": "array",
              "items": {"type": "string"}
            }
          }
        }
      }
    }]
  };
  const expected = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Hello\nUse the "lookup" tool!' }]
      }
    ],
    generationConfig: {...generationConfig, temperature: 0.5, maxOutputTokens: 100},
    safetySettings,
    tools: [{
      function_declarations: [{
        "name": "lookup",
        "description": "Semantic search",
        "parameters": {
          "type": "object",
          "properties": {
            "hypotheticals": {
              "type": "array",
              "items": {"type": "string"}
            }
          }
        }
      }]
    }],
    tool_config: {
      function_calling_config: {
        mode: "ANY"
      }
    }
  };
  t.deepEqual(chatml_to_gemini(input), expected);
});

test('handles message content as an array', t => {
  const input = {
    messages: [
      { role: 'user', content: [
        { type: 'text', text: 'User message' }
      ]},
      { role: 'assistant', content: [
        { type: 'text', text: 'Assistant message' }
      ]},
      { role: 'user', content: [
        { type: 'text', text: 'User message 2' }
      ]}
    ],
    temperature: 0.5
  };
  const expected = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'User message' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Assistant message' }]
      },
      {
        role: 'user',
        parts: [{ text: 'User message 2' }]
      }
    ],
    generationConfig: {...generationConfig, temperature: 0.5},
    safetySettings
  };
  const result = chatml_to_gemini(input);
  t.deepEqual(result, expected);
});

test('should handle images', t => {
  const input = {
    messages: [
      { role: 'user', content: [
        {type: 'text', text: 'Transcribe this image' },
        {type: 'image_url', image_url: {url: 'data:image/jpg;base64,Base64 image'}}
      ]}
    ]
  };
  const expected = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Transcribe this image' },
          { inline_data: {
            mime_type: 'image/jpeg',
            data: 'Base64 image'
          }}
        ]
      }
    ],
    generationConfig,
    safetySettings
  };
  const result = chatml_to_gemini(input);
  t.deepEqual(result, expected);
})

