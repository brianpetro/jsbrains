import test from 'ava';
import dotenv from 'dotenv';
import { SmartChatModel } from '../smart_chat_model.js';
import { SmartChatModelAnthropicAdapter, SmartChatModelAnthropicRequestAdapter, SmartChatModelAnthropicResponseAdapter } from './anthropic.js';

// Create an instance of SmartChatModel for Anthropic
const smart_chat_model_anthropic = new SmartChatModel({
  settings: {
    adapter: 'anthropic',
    anthropic: {
      api_key: 'test_api_key',
      model_key: 'claude-2.1',
    }
  },
  adapters: {
    anthropic: SmartChatModelAnthropicAdapter
  }
});

test('SmartChatModelAnthropicRequestAdapter converts OpenAI request to Anthropic schema', t => {
  const openai_request = {
    model: 'claude-2.1',
    messages: [
      { role: 'system', content: 'You are a helpful weather assistant.' },
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

  const request_adapter = new SmartChatModelAnthropicRequestAdapter(smart_chat_model_anthropic.adapter, openai_request);
  const anthropic_request = request_adapter.to_anthropic();

  t.is(anthropic_request.url, 'https://api.anthropic.com/v1/messages');
  t.is(anthropic_request.method, 'POST');
  t.deepEqual(anthropic_request.headers, {
    ...SmartChatModelAnthropicAdapter.config.headers,
    'Content-Type': 'application/json',
    'x-api-key': 'test_api_key'
  });

  const body = JSON.parse(anthropic_request.body);
  t.is(body.model, 'claude-2.1');
  t.is(body.max_tokens, 1000);
  t.is(body.temperature, 0.7);
  t.is(body.stream, false);
  t.is(body.system, 'You are a helpful weather assistant.');
  t.deepEqual(body.messages, [
    { role: 'user', content: 'Hello, how are you?' },
    { role: 'assistant', content: 'I\'m doing well, thank you for asking! How can I assist you today?' },
    { role: 'user', content: 'What\'s the weather like?' }
  ]);
  t.deepEqual(body.tools, [
    {
      name: 'weather_api',
      description: 'Get weather information for a location',
      input_schema: openai_request.tools[0].function.parameters
    }
  ]);
  t.deepEqual(body.tool_choice, { type: 'auto' });
});

test('SmartChatModelAnthropicResponseAdapter converts Anthropic response to OpenAI schema', t => {
  const anthropic_response = {
    id: 'msg_1234567890',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'To get the weather information, I\'ll need to use the weather API. Let me do that for you.'
      },
      {
        type: 'tool_use',
        tool_use: {
          id: 'call_1234567890',
          name: 'weather_api',
          input: {
            location: 'New York',
            date: '2023-03-01'
          }
        }
      },
      {
        type: 'text',
        text: 'Here is the weather information for New York: It\'s currently sunny with a temperature of 72°F (22°C). The forecast predicts clear skies throughout the day with a high of 78°F (26°C) and a low of 65°F (18°C). It\'s a perfect day to spend some time outdoors!'
      }
    ],
    model: 'claude-2.1',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 20,
      output_tokens: 25
    }
  };

  const response_adapter = new SmartChatModelAnthropicResponseAdapter(smart_chat_model_anthropic.adapter, anthropic_response);
  const openai_response = response_adapter.to_openai();

  t.is(openai_response.id, 'msg_1234567890');
  t.is(openai_response.object, 'chat.completion');
  t.truthy(openai_response.created);
  t.deepEqual(openai_response.choices[0].message, {
    role: 'assistant',
    content: 'To get the weather information, I\'ll need to use the weather API. Let me do that for you.\n\nHere is the weather information for New York: It\'s currently sunny with a temperature of 72°F (22°C). The forecast predicts clear skies throughout the day with a high of 78°F (26°C) and a low of 65°F (18°C). It\'s a perfect day to spend some time outdoors!',
    tool_calls: [
      {
        id: 'call_1234567890',
        type: 'function',
        function: {
          name: 'weather_api',
          arguments: JSON.stringify({
            location: 'New York',
            date: '2023-03-01'
          })
        }
      }
    ]
  });
  t.is(openai_response.choices[0].finish_reason, 'stop');
  t.deepEqual(openai_response.usage, {
    prompt_tokens: 20,
    completion_tokens: 25,
    total_tokens: 45
  });
});

dotenv.config({ path: '../.env' });

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

test.serial('Live Anthropic Integration Test', async t => {
  if (!ANTHROPIC_API_KEY) {
    t.pass('Skipping live test: No Anthropic API key found in .env');
    return;
  }

  const smart_chat_model = new SmartChatModel({
    settings: {
      platform_key: 'anthropic',
      anthropic: {
        api_key: ANTHROPIC_API_KEY,
        model_key: 'claude-2.1',
      }
    },
    adapters: {
      anthropic: SmartChatModelAnthropicAdapter
    }
  });
  // fetch all models
  const models = await smart_chat_model.get_models();
  console.log(JSON.stringify(models, null, 2));

  const request = {
    messages: [
      { role: 'user', content: 'What is the capital of Germany?' }
    ],
    max_tokens: 100,
    temperature: 0.7
  };

  try {
    const response = await smart_chat_model.complete(request);
    console.log(JSON.stringify(response, null, 2));
    t.truthy(response.choices[0].message.content);
    t.is(response.choices[0].message.role, 'assistant');
    t.truthy(response.usage.total_tokens > 0);
  } catch (error) {
    console.log(error);
    t.fail(`Live test failed: ${error.message}`);
  }
});
