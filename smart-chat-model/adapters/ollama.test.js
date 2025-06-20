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