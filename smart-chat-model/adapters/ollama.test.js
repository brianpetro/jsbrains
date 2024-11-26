import test from 'ava';
import { SmartChatModel } from '../smart_chat_model.js';
import { SmartChatModelOllamaAdapter, SmartChatModelOllamaResponseAdapter, SmartChatModelOllamaRequestAdapter } from './ollama.js';

// Create an instance of SmartChatModel for Ollama
const smart_chat_model_ollama = new SmartChatModel({
  settings: {
    adapter: 'ollama',
    ollama: {
      base_url: 'http://localhost:11434',
      model_key: 'phi:latest',
    }
  },
  adapters: {
    ollama: SmartChatModelOllamaAdapter
  }
});

test('SmartChatModelOllamaResponseAdapter converts Ollama response to OpenAI schema', t => {
  const ollama_response = {
    model: 'phi:latest',
    created_at: '2024-11-20T22:40:42.149254Z',
    message: {
      role: 'assistant',
      content: ' Hello there! How can I assist you today?\n'
    },
    done_reason: 'stop',
    done: true,
    total_duration: 9190493500,
    load_duration: 8685658583,
    prompt_eval_count: 33,
    prompt_eval_duration: 200134000,
    eval_count: 12,
    eval_duration: 258990000
  };

  const response_adapter = new SmartChatModelOllamaResponseAdapter(smart_chat_model_ollama.adapter, ollama_response);
  const openai_response = response_adapter.to_openai();

  // Verify the converted response matches OpenAI schema
  t.truthy(openai_response.created);
  t.is(openai_response.object, 'chat.completion');
  
  // Verify choices array
  t.true(Array.isArray(openai_response.choices));
  t.is(openai_response.choices.length, 1);
  
  // Verify message content
  t.deepEqual(openai_response.choices[0].message, {
    role: 'assistant',
    content: ' Hello there! How can I assist you today?\n'
  });
  
  // Verify finish reason
  t.is(openai_response.choices[0].finish_reason, 'stop');

  // Verify usage metrics are included
  t.deepEqual(openai_response.usage, {
    prompt_tokens: 33,
    completion_tokens: 12,
    total_tokens: 45
  });
});

test('SmartChatModelOllamaRequestAdapter converts OpenAI-style request to Ollama format', t => {
  const openai_request = {
    model: 'phi:latest',
    messages: [
      {
        role: 'user',
        content: 'Hello!'
      }
    ],
    max_tokens: 300,
    temperature: 0.7
  };

  const request_adapter = new SmartChatModelOllamaRequestAdapter(smart_chat_model_ollama.adapter, openai_request);
  const ollama_request = request_adapter.to_platform();

  // Verify basic request structure
  t.is(ollama_request.method, 'POST');
  t.is(ollama_request.url, 'http://localhost:11434/api/chat');
  
  // Parse body and verify contents
  const body = JSON.parse(ollama_request.body);
  t.is(body.model, 'phi:latest'); // Should use configured model
  t.deepEqual(body.messages, [{
    role: 'user',
    content: 'Hello!'
  }]);
  t.deepEqual(body.options, {
    num_predict: 300,
    temperature: 0.7
  });
});

test('SmartChatModelOllamaRequestAdapter handles multimodal messages correctly', t => {
  const openai_request = {
    model: 'llava',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: "What's in this image?"
          },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
            }
          }
        ]
      }
    ],
    max_tokens: 300
  };

  const request_adapter = new SmartChatModelOllamaRequestAdapter(smart_chat_model_ollama.adapter, openai_request);
  const ollama_request = request_adapter.to_platform();

  const body = JSON.parse(ollama_request.body);
  
  // Should combine text parts and move images to images array
  t.deepEqual(body.messages, [{
    role: 'user',
    content: "What's in this image?",
    images: ['data:image/jpeg;base64,/9j/4AAQSkZJRg...']
  }]);
});

test('SmartChatModelOllamaRequestAdapter handles function calling format', t => {
  const openai_request = {
    model: 'phi:latest',
    messages: [
      {
        role: 'user',
        content: 'What is the weather in Paris?'
      }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'weather_api',
          description: 'Get weather information for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string' },
              date: { type: 'string' }
            },
            required: ['location']
          }
        }
      }
    ],
    tool_choice: {
      type: 'function',
      function: {
        name: 'lookup'
      }
    },
    max_tokens: 300
  };

  const request_adapter = new SmartChatModelOllamaRequestAdapter(smart_chat_model_ollama.adapter, openai_request);
  const ollama_request = request_adapter.to_platform();

  const body = JSON.parse(ollama_request.body);
  
  // Should convert functions to tools array
  t.deepEqual(body.tools, [{
    type: 'function',
    function: {
      name: 'weather_api',
      description: 'Get weather information for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          date: { type: 'string' }
        },
        required: ['location']
      }
    }
  }]);
  // should force tool use by appending tool name to user prompt
  t.is(body.messages[0].role, 'user');
  t.true(body.messages[0].content.endsWith('Use the "lookup" tool.'), 'should append tool name to user prompt');
});

test('SmartChatModelOllamaRequestAdapter handles advanced parameters', t => {
  const openai_request = {
    model: 'phi:latest',
    messages: [
      {
        role: 'user',
        content: 'Hello!'
      }
    ],
    temperature: 0.7,
    top_p: 0.9,
    frequency_penalty: 0.5,
    presence_penalty: 0.2,
    max_tokens: 300,
    stream: true
  };

  const request_adapter = new SmartChatModelOllamaRequestAdapter(smart_chat_model_ollama.adapter, openai_request);
  const ollama_request = request_adapter.to_platform();
  const body = JSON.parse(ollama_request.body);
  
  // Should convert parameters to Ollama options format
  t.deepEqual(body.options, {
    temperature: 0.7,
    top_p: 0.9,
    frequency_penalty: 0.5,
    presence_penalty: 0.2,
    num_predict: 300
  });
  t.is(body.stream, true);
});

// ##### Response

// A stream of JSON objects is returned:

// ```json
// {
//   "model": "llama3.2",
//   "created_at": "2023-08-04T08:52:19.385406455-07:00",
//   "message": {
//     "role": "assistant",
//     "content": "The",
//     "images": null
//   },
//   "done": false
// }
// ```

// Final response:

// ```json
// {
//   "model": "llama3.2",
//   "created_at": "2023-08-04T19:22:45.499127Z",
//   "done": true,
//   "total_duration": 4883583458,
//   "load_duration": 1334875,
//   "prompt_eval_count": 26,
//   "prompt_eval_duration": 342546000,
//   "eval_count": 282,
//   "eval_duration": 4535599000
// }
// ```

// #### Chat request (No streaming)

// ##### Request

// ```shell
// curl http://localhost:11434/api/chat -d '{
//   "model": "llama3.2",
//   "messages": [
//     {
//       "role": "user",
//       "content": "why is the sky blue?"
//     }
//   ],
//   "stream": false
// }'
// ```

// ##### Response

// ```json
// {
//   "model": "llama3.2",
//   "created_at": "2023-12-12T14:13:43.416799Z",
//   "message": {
//     "role": "assistant",
//     "content": "Hello! How are you today?"
//   },
//   "done": true,
//   "total_duration": 5191566416,
//   "load_duration": 2154458,
//   "prompt_eval_count": 26,
//   "prompt_eval_duration": 383809000,
//   "eval_count": 298,
//   "eval_duration": 4799921000
// }
// ```

// #### Chat request (With History)

// Send a chat message with a conversation history. You can use this same approach to start the conversation using multi-shot or chain-of-thought prompting.

// ##### Request

// ```shell
// curl http://localhost:11434/api/chat -d '{
//   "model": "llama3.2",
//   "messages": [
//     {
//       "role": "user",
//       "content": "why is the sky blue?"
//     },
//     {
//       "role": "assistant",
//       "content": "due to rayleigh scattering."
//     },
//     {
//       "role": "user",
//       "content": "how is that different than mie scattering?"
//     }
//   ]
// }'
// ```

// ##### Response

// A stream of JSON objects is returned:

// ```json
// {
//   "model": "llama3.2",
//   "created_at": "2023-08-04T08:52:19.385406455-07:00",
//   "message": {
//     "role": "assistant",
//     "content": "The"
//   },
//   "done": false
// }
// ```

// Final response:

// ```json
// {
//   "model": "llama3.2",
//   "created_at": "2023-08-04T19:22:45.499127Z",
//   "done": true,
//   "total_duration": 8113331500,
//   "load_duration": 6396458,
//   "prompt_eval_count": 61,
//   "prompt_eval_duration": 398801000,
//   "eval_count": 468,
//   "eval_duration": 7701267000
// }
// ```

// #### Chat request (with images)

// ##### Request

// Send a chat message with images. The images should be provided as an array, with the individual images encoded in Base64.

// ```shell
// curl http://localhost:11434/api/chat -d '{
//   "model": "llava",
//   "messages": [
//     {
//       "role": "user",
//       "content": "what is in this image?",
//       "images": ["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"]
//     }
//   ]
// }'
// ```

// ##### Response

// ```json
// {
//   "model": "llava",
//   "created_at": "2023-12-13T22:42:50.203334Z",
//   "message": {
//     "role": "assistant",
//     "content": " The image features a cute, little pig with an angry facial expression. It's wearing a heart on its shirt and is waving in the air. This scene appears to be part of a drawing or sketching project.",
//     "images": null
//   },
//   "done": true,
//   "total_duration": 1668506709,
//   "load_duration": 1986209,
//   "prompt_eval_count": 26,
//   "prompt_eval_duration": 359682000,
//   "eval_count": 83,
//   "eval_duration": 1303285000
// }
// ```

// #### Chat request (Reproducible outputs)

// ##### Request

// ```shell
// curl http://localhost:11434/api/chat -d '{
//   "model": "llama3.2",
//   "messages": [
//     {
//       "role": "user",
//       "content": "Hello!"
//     }
//   ],
//   "options": {
//     "seed": 101,
//     "temperature": 0
//   }
// }'
// ```

// ##### Response

// ```json
// {
//   "model": "llama3.2",
//   "created_at": "2023-12-12T14:13:43.416799Z",
//   "message": {
//     "role": "assistant",
//     "content": "Hello! How are you today?"
//   },
//   "done": true,
//   "total_duration": 5191566416,
//   "load_duration": 2154458,
//   "prompt_eval_count": 26,
//   "prompt_eval_duration": 383809000,
//   "eval_count": 298,
//   "eval_duration": 4799921000
// }
// ```

// #### Chat request (with tools)

// ##### Request

// ```
// curl http://localhost:11434/api/chat -d '{
//   "model": "llama3.2",
//   "messages": [
//     {
//       "role": "user",
//       "content": "What is the weather today in Paris?"
//     }
//   ],
//   "stream": false,
//   "tools": [
//     {
//       "type": "function",
//       "function": {
//         "name": "get_current_weather",
//         "description": "Get the current weather for a location",
//         "parameters": {
//           "type": "object",
//           "properties": {
//             "location": {
//               "type": "string",
//               "description": "The location to get the weather for, e.g. San Francisco, CA"
//             },
//             "format": {
//               "type": "string",
//               "description": "The format to return the weather in, e.g. 'celsius' or 'fahrenheit'",
//               "enum": ["celsius", "fahrenheit"]
//             }
//           },
//           "required": ["location", "format"]
//         }
//       }
//     }
//   ]
// }'
// ```

// ##### Response

// ```json
// {
//   "model": "llama3.2",
//   "created_at": "2024-07-22T20:33:28.123648Z",
//   "message": {
//     "role": "assistant",
//     "content": "",
//     "tool_calls": [
//       {
//         "function": {
//           "name": "get_current_weather",
//           "arguments": {
//             "format": "celsius",
//             "location": "Paris, FR"
//           }
//         }
//       }
//     ]
//   },
//   "done_reason": "stop",
//   "done": true,
//   "total_duration": 885095291,
//   "load_duration": 3753500,
//   "prompt_eval_count": 122,
//   "prompt_eval_duration": 328493000,
//   "eval_count": 33,
//   "eval_duration": 552222000
// }
// ```