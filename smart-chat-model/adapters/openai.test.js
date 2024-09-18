import test from 'ava';
import dotenv from 'dotenv';
import { SmartChatModel } from '../smart_chat_model.js';
import { SmartChatModelOpenaiAdapter } from './openai.js';
import { SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

// Create an instance of SmartChatModel for OpenAI
const smart_chat_model_openai = new SmartChatModel({
  settings: {
    platform_key: 'openai',
    openai: {
      api_key: 'test_api_key',
      model_key: 'gpt-4',
    }
  },
  adapters: {
    openai: SmartChatModelOpenaiAdapter
  }
});

test('SmartChatModelRequestAdapter handles valid OpenAI request', t => {
  const valid_request = {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' },
    ],
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 1000,
    stream: false,
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
    tool_choice: 'auto'
  };

  const request_adapter = new SmartChatModelRequestAdapter(smart_chat_model_openai.adapter, valid_request);
  const openai_request = request_adapter.to_openai();

  const body = JSON.parse(openai_request.body);

  t.deepEqual(body.messages, valid_request.messages);
  t.is(body.model, 'gpt-4');
  t.is(body.temperature, 0.7);
  t.is(body.max_tokens, 1000);
  t.is(body.stream, false);
  t.deepEqual(body.tools, valid_request.tools);
  t.is(body.tool_choice, 'auto');
});

test('SmartChatModelRequestAdapter handles request with tools', t => {
  const valid_request = {
    messages: [
      { role: 'user', content: 'What\'s the weather like?' }
    ],
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 1000,
    stream: false,
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get the current weather in a given location',
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

  const request_adapter = new SmartChatModelRequestAdapter(smart_chat_model_openai.adapter, valid_request);
  const openai_request = request_adapter.to_openai();

  const body = JSON.parse(openai_request.body);

  t.deepEqual(body.tools, valid_request.tools);
  t.is(body.tool_choice, 'auto');
});

test('SmartChatModelResponseAdapter handles valid OpenAI response', t => {
  const valid_response = {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: 1677652288,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: 'Hello! I\'m doing well, thank you for asking. How can I assist you today?',
        tool_calls: [
          {
            id: 'call_abc123',
            type: 'function',
            function: {
              name: 'weather_api',
              arguments: '{"location": "New York", "date": "2023-03-01"}'
            }
          }
        ]
      },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 9,
      completion_tokens: 12,
      total_tokens: 21,
    },
  };

  const response_adapter = new SmartChatModelResponseAdapter(smart_chat_model_openai.adapter, valid_response);
  const openai_response = response_adapter.to_openai();

  t.is(openai_response.id, 'chatcmpl-123');
  t.is(openai_response.object, 'chat.completion');
  t.is(openai_response.created, 1677652288);
  t.deepEqual(openai_response.choices[0].message, valid_response.choices[0].message);
  t.is(openai_response.choices[0].finish_reason, 'stop');
  t.deepEqual(openai_response.usage, valid_response.usage);
});

test('SmartChatModelResponseAdapter handles response with tool calls', t => {
  const valid_response = {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: 1677652288,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: 'To get the weather information, I\'ll need to use the weather API. Let me do that for you.',
        tool_calls: [
          {
            id: 'call_abc123',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: '{"location": "New York", "unit": "celsius"}'
            }
          }
        ]
      },
      finish_reason: 'tool_calls',
    }],
    usage: {
      prompt_tokens: 20,
      completion_tokens: 25,
      total_tokens: 45,
    },
  };

  const response_adapter = new SmartChatModelResponseAdapter(smart_chat_model_openai.adapter, valid_response);
  const openai_response = response_adapter.to_openai();

  t.is(openai_response.choices[0].message.tool_calls[0].id, 'call_abc123');
  t.is(openai_response.choices[0].message.tool_calls[0].function.name, 'get_weather');
  t.is(openai_response.choices[0].message.tool_calls[0].function.arguments, '{"location": "New York", "unit": "celsius"}');
  t.is(openai_response.choices[0].finish_reason, 'tool_calls');
});

test('SmartChatModelOpenaiAdapter parses model data correctly', t => {
  const mock_model_data = {
    data: [
      { id: 'gpt-3.5-turbo-0125' },
      { id: 'gpt-4-0125-preview' },
      { id: 'gpt-4-vision-preview' },
      { id: 'text-davinci-003' }, // This should be filtered out
    ]
  };

  const parsed_models = smart_chat_model_openai.adapter.parse_model_data(mock_model_data);

  t.is(parsed_models.length, 3);
  t.is(parsed_models[0].model_name, 'gpt-3.5-turbo-0125');
  t.is(parsed_models[1].model_name, 'gpt-4-0125-preview');
  t.is(parsed_models[2].model_name, 'gpt-4-vision-preview');
  t.true(parsed_models[2].multimodal);
  t.false(parsed_models[0].multimodal);
  t.truthy(parsed_models[0].max_input_tokens);
  t.truthy(parsed_models[0].description);
});

dotenv.config({ path: '../.env' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

test.serial('Live OpenAI Integration Test', async t => {
  if (!OPENAI_API_KEY) {
    console.log('Skipping live test: No OpenAI API key found in .env');
    t.fail('Skipping live test: No OpenAI API key found in .env');
    return;
  }

  const smart_chat_model = new SmartChatModel({
    settings: {
      platform_key: 'openai',
      openai: {
        api_key: OPENAI_API_KEY,
        model_key: 'gpt-3.5-turbo',
        models: [ // cached models
          {
            "model_name": "gpt-3.5-turbo",
            "key": "gpt-3.5-turbo",
            "multimodal": false,
            "max_input_tokens": 16385,
            "description": "context: 16385, output: 4096"
          },
        ]
      }
    },
    adapters: {
      openai: SmartChatModelOpenaiAdapter
    }
  });

  // // fetch all models
  // const models = await smart_chat_model.get_models();
  // console.log(JSON.stringify(models, null, 2));

  const request = {
    messages: [
      { role: 'user', content: 'What is the capital of Japan?' }
    ],
    max_tokens: 100,
    temperature: 0.7
  };

  try {
    const response = await smart_chat_model.complete(request);
    // console.log(JSON.stringify(response, null, 2));
    t.truthy(response.choices[0].message.content);
    t.is(response.choices[0].message.role, 'assistant');
    t.truthy(response.usage.total_tokens > 0);
  } catch (error) {
    console.error(error, error.stack);
    t.fail(`Live test failed: ${error.message}`);
  }
});

test.serial('Live OpenAI get_models Integration Test', async t => {
  if (!OPENAI_API_KEY) {
    t.pass('Skipping live test: No OpenAI API key found in .env');
    return;
  }

  const smart_chat_model = new SmartChatModel({
    settings: {
      platform_key: 'openai',
      openai: {
        api_key: OPENAI_API_KEY,
        model_key: 'gpt-3.5-turbo',
      }
    },
    adapters: {
      openai: SmartChatModelOpenaiAdapter
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
      model.hasOwnProperty('multimodal') &&
      model.hasOwnProperty('max_input_tokens') &&
      model.hasOwnProperty('description')
    ));
  } catch (error) {
    console.error(error);
    t.fail(`Live test failed: ${error.message}`);
  }
});
