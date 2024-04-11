/**
 * Request
 * curl --request POST \
  --url https://api.cohere.ai/v1/chat \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header "Authorization: bearer $CO_API_KEY" \
  --data '{
    "chat_history": [
      {"role": "USER", "message": "Who discovered gravity?"},
      {"role": "CHATBOT", "message": "The man who is widely credited with discovering gravity is Sir Isaac Newton"}
    ],
    "message": "What year was he born?",
    "connectors": [{"id": "web-search"}]
  }'
 */

/**
 * Response
 * {
  "text": "string",
  "generation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "citations": [
    {
      "start": 0,
      "end": 0,
      "text": "string",
      "document_ids": [
        "string"
      ]
    }
  ],
  "documents": [
    {
      "id": "string",
      "additionalProp": "string"
    }
  ],
  "is_search_required": true,
  "search_queries": [
    {
      "text": "string",
      "generation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    }
  ],
  "search_results": [
    {
      "search_query": {
        "text": "string",
        "generation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
      },
      "connector": {
        "id": "string"
      },
      "document_ids": [
        "string"
      ],
      "error_message": "string",
      "continue_on_failure": true
    }
  ],
  "finish_reason": "COMPLETE",
  "tool_calls": [
    {
      "name": "string",
      "parameters": {
        "additionalProp": {}
      }
    }
  ],
  "chat_history": [
    {
      "role": "CHATBOT",
      "message": "string"
    }
  ]
}
 */

const test = require('ava');
const { chatml_to_cohere } = require('./cohere');

test('chatml_to_cohere', (t) => {
  const input = {
    model: 'command-r',
    messages: [
      { role: 'system', content: 'System message' },
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
    model: 'command-r',
    chat_history: [
      { role: 'system', message: 'System message' },
    ],
    message: 'User message',
    temperature: 0.5,
  };

  const cohere = chatml_to_cohere(input);
  t.deepEqual(cohere, expected);
});

