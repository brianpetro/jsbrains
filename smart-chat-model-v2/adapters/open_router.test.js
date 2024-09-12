import test from 'ava';
import dotenv from 'dotenv';
import { SmartChatModel } from '../smart_chat_model.js';
import { SmartChatModelOpenRouterAdapter, SmartChatModelOpenRouterRequestAdapter, SmartChatModelOpenRouterResponseAdapter } from './open_router.js';

dotenv.config({ path: '../.env' });

const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;

// Create an instance of SmartChatModel for OpenRouter
const smart_chat_model = new SmartChatModel({
  settings: {
    platform_key: 'open_router',
    open_router: {
      api_key: 'test_api_key',
      model_key: 'openai/gpt-3.5-turbo',
    }
  },
  adapters: {
    open_router: SmartChatModelOpenRouterAdapter
  }
});

test('SmartChatModelOpenRouterRequestAdapter converts OpenAI request to OpenRouter schema', t => {
  const openai_request = {
    model: 'openai/gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' },
      { role: 'assistant', content: 'I\'m doing well, thank you for asking! How can I assist you today?' },
      { role: 'user', content: 'What\'s the weather like?' }
    ],
    max_tokens: 1000,
    temperature: 0.7,
    stream: false,
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get weather information for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string' },
              unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
            },
            required: ['location']
          }
        }
      }
    ],
    tool_choice: 'auto'
  };

  const request_adapter = new SmartChatModelOpenRouterRequestAdapter(smart_chat_model.adapter, openai_request);
  const openrouter_request = request_adapter.to_platform();

  t.is(openrouter_request.method, 'POST');
  t.deepEqual(openrouter_request.headers, {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test_api_key',
  });

  const body = JSON.parse(openrouter_request.body);
  t.is(body.model, 'openai/gpt-3.5-turbo');
  t.is(body.max_tokens, 1000);
  t.is(body.temperature, 0.7);
  t.is(body.stream, false);
  t.deepEqual(body.messages, openai_request.messages);
  t.deepEqual(body.tools, openai_request.tools);
  t.is(body.tool_choice, 'auto');
});

test('SmartChatModelOpenRouterResponseAdapter converts OpenRouter response to OpenAI schema', t => {
  const openrouter_response = {
    id: 'response_1234567890',
    object: 'chat.completion',
    created: Date.now(),
    model: 'openai/gpt-3.5-turbo',
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'The weather in New York is currently sunny with a temperature of 72°F (22°C).',
          tool_calls: [
            {
              id: 'tool_call_1234567890',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"location": "New York", "unit": "fahrenheit"}'
              }
            }
          ]
        },
        finish_reason: 'function_call'
      }
    ],
    usage: {
      prompt_tokens: 20,
      completion_tokens: 15,
      total_tokens: 35
    }
  };

  const response_adapter = new SmartChatModelOpenRouterResponseAdapter(smart_chat_model.adapter, openrouter_response);
  const openai_response = response_adapter.to_platform();

  t.is(openai_response.id, 'response_1234567890');
  t.is(openai_response.object, 'chat.completion');
  t.truthy(openai_response.created);
  t.deepEqual(openai_response.choices[0].message, {
    role: 'assistant',
    content: 'The weather in New York is currently sunny with a temperature of 72°F (22°C).',
    tool_calls: [
      {
        id: 'tool_call_1234567890',
        type: 'function',
        function: {
          name: 'get_weather',
          arguments: '{"location": "New York", "unit": "fahrenheit"}'
        }
      }
    ]
  });
  t.is(openai_response.choices[0].finish_reason, 'function_call');
  t.deepEqual(openai_response.usage, {
    prompt_tokens: 20,
    completion_tokens: 15,
    total_tokens: 35
  });
});

test.serial('Live OpenRouter Integration Test', async t => {
  if (!OPEN_ROUTER_API_KEY) {
    t.fail('Skipping live test: No OpenRouter API key found in .env');
    return;
  }

  const smart_chat_model = new SmartChatModel({
    settings: {
      platform_key: 'open_router',
      open_router: {
        api_key: OPEN_ROUTER_API_KEY,
        model_key: 'openai/gpt-3.5-turbo',
      }
    },
    adapters: {
      open_router: SmartChatModelOpenRouterAdapter
    }
  });

  const request = {
    messages: [
      { role: 'user', content: 'What is the capital of France?' }
    ],
    max_tokens: 100,
    temperature: 0.7
  };

  try {
    const response = await smart_chat_model.complete(request);
    console.log(JSON.stringify(response, null, 2));
    t.truthy(response.choices[0].message.content);
    t.is(response.choices[0].message.role, 'assistant');
    t.truthy(response.usage.prompt_tokens > 0);
    t.truthy(response.usage.completion_tokens > 0);
    t.truthy(response.usage.total_tokens > 0);
  } catch (error) {
    console.error(error);
    t.fail(`Live test failed: ${error.message}`);
  }
});

test.serial('Live OpenRouter get_models Integration Test', async t => {
  if (!OPEN_ROUTER_API_KEY) {
    t.pass('Skipping live test: No OpenRouter API key found in .env');
    return;
  }

  const smart_chat_model = new SmartChatModel({
    settings: {
      platform_key: 'open_router',
      open_router: {
        api_key: OPEN_ROUTER_API_KEY,
        model_key: 'openai/gpt-3.5-turbo',
      }
    },
    adapters: {
      open_router: SmartChatModelOpenRouterAdapter
    }
  });

  try {
    const models = await smart_chat_model.get_models();
    // console.log(JSON.stringify(models, null, 2));
    t.true(Array.isArray(models));
    t.true(models.length > 0);
    t.true(models.every(model => 
      model.hasOwnProperty('model_name') &&
      model.hasOwnProperty('key') &&
      model.hasOwnProperty('max_input_tokens') &&
      model.hasOwnProperty('description') &&
      model.hasOwnProperty('actions') &&
      model.hasOwnProperty('multimodal') &&
      model.hasOwnProperty('raw')
    ));
  } catch (error) {
    console.error(error);
    t.fail(`Live test failed: ${error.message}`);
  }
});