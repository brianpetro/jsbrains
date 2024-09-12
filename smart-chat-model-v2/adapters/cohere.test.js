import test from 'ava';
import dotenv from 'dotenv';
import { SmartChatModel } from '../smart_chat_model.js';
import { SmartChatModelCohereAdapter, SmartChatModelCohereRequestAdapter, SmartChatModelCohereResponseAdapter } from './cohere.js';

dotenv.config({ path: '../.env' });

const COHERE_API_KEY = process.env.COHERE_API_KEY;

const smart_chat_model = new SmartChatModel({
  settings: {
    platform_key: 'cohere',
    cohere: {
      api_key: 'test_api_key',
      model_key: 'command',
    }
  },
  adapters: {
    cohere: SmartChatModelCohereAdapter
  }
});

test('SmartChatModelCohereRequestAdapter converts OpenAI request to Cohere schema', t => {
  const openai_request = {
    model: 'command',
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
    tool_choice: 'auto',
    preamble: 'This is a preamble',
    conversation_id: 'conv_123',
    response_format: { type: 'json_object' }
  };

  const request_adapter = new SmartChatModelCohereRequestAdapter(smart_chat_model.adapter, openai_request);
  const cohere_request = request_adapter.to_cohere();

  t.is(cohere_request.method, 'POST');
  t.deepEqual(cohere_request.headers, {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test_api_key'
  });

  const body = JSON.parse(cohere_request.body);
  t.is(body.model, 'command');
  t.is(body.max_tokens, 1000);
  t.is(body.temperature, 0.7);
  t.is(body.stream, false);
  t.is(body.message, 'What\'s the weather like?');
  t.deepEqual(body.chat_history, [
    { role: 'SYSTEM', message: 'You are a helpful assistant.' },
    { role: 'USER', message: 'Hello, how are you?' },
    { role: 'CHATBOT', message: 'I\'m doing well, thank you for asking! How can I assist you today?' }
  ]);
  t.deepEqual(body.tools, [{
    name: 'get_weather',
    description: 'Get weather information for a location',
    parameters: openai_request.tools[0].function.parameters
  }]);
  t.is(body.tool_choice, 'auto');
  t.is(body.preamble, 'This is a preamble');
  t.is(body.conversation_id, 'conv_123');
  t.deepEqual(body.response_format, { type: 'json_object' });
});

test('SmartChatModelCohereRequestAdapter throws error for image input', t => {
  const openai_request = {
    model: 'command',
    messages: [
      { role: 'user', content: [
        { type: 'text', text: 'What\'s in this image?' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA...' } }
      ] }
    ],
    max_tokens: 500,
    temperature: 0.8
  };

  const request_adapter = new SmartChatModelCohereRequestAdapter(smart_chat_model.adapter, openai_request);
  
  const error = t.throws(() => {
    request_adapter.to_platform();
  }, { instanceOf: Error });

  t.is(error.message, "Cohere API does not support image input");
});

test('SmartChatModelCohereResponseAdapter converts Cohere response to OpenAI schema', t => {
  const cohere_response = {
    text: 'The weather in New York is currently sunny with a temperature of 72°F (22°C).',
    generation_id: 'gen_123456789',
    finish_reason: 'COMPLETE',
    citations: [
      { start: 0, end: 10, text: 'The weather', document_ids: ['doc1'] }
    ],
    documents: [
      { id: 'doc1', title: 'Weather Report', snippet: 'New York weather report', url: 'http://example.com', timestamp: '2023-06-01T12:00:00Z' }
    ],
    search_queries: [
      { text: 'New York weather', generation_id: 'gen_987654321' }
    ],
    search_results: [
      { connector: { id: 'web' }, document_ids: ['doc1'], search_query: { text: 'New York weather', generation_id: 'gen_987654321' } }
    ],
    meta: {
      api_version: { version: '1.0' },
      billed_units: { input_tokens: 20, output_tokens: 15 },
      tokens: { input_tokens: 20, output_tokens: 15 }
    }
  };

  const response_adapter = new SmartChatModelCohereResponseAdapter(smart_chat_model.adapter, cohere_response);
  const openai_response = response_adapter.to_openai();

  t.is(openai_response.id, 'gen_123456789');
  t.is(openai_response.object, 'chat.completion');
  t.truthy(openai_response.created);
  t.deepEqual(openai_response.choices[0].message, {
    role: 'assistant',
    content: 'The weather in New York is currently sunny with a temperature of 72°F (22°C).',
    citations: cohere_response.citations,
    documents: cohere_response.documents,
    search_queries: cohere_response.search_queries,
    search_results: cohere_response.search_results
  });
  t.is(openai_response.choices[0].finish_reason, 'stop');
  t.deepEqual(openai_response.usage, {
    prompt_tokens: 20,
    completion_tokens: 15,
    total_tokens: 35
  });
});

test.serial('Live Cohere Integration Test', async t => {
  if (!COHERE_API_KEY) {
    t.pass('Skipping live test: No Cohere API key found in .env');
    return;
  }

  const smart_chat_model = new SmartChatModel({
    settings: {
      platform_key: 'cohere',
      cohere: {
        api_key: COHERE_API_KEY,
        model_key: 'command',
      }
    },
    adapters: {
      cohere: SmartChatModelCohereAdapter
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
    console.error('Error details:', error);
    t.fail(`Live test failed: ${error.message}`);
  }
});

test.serial('Live Cohere get_models Integration Test', async t => {
  if (!COHERE_API_KEY) {
    t.pass('Skipping live test: No Cohere API key found in .env');
    return;
  }

  const smart_chat_model = new SmartChatModel({
    settings: {
      platform_key: 'cohere',
      cohere: {
        api_key: COHERE_API_KEY,
        model_key: 'command',
      }
    },
    adapters: {
      cohere: SmartChatModelCohereAdapter
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
      model.hasOwnProperty('tokenizer_url') &&
      model.hasOwnProperty('finetuned') &&
      model.hasOwnProperty('description') &&
      model.hasOwnProperty('raw')
    ));
  } catch (error) {
    console.error(error);
    t.fail(`Live test failed: ${error.message}`);
  }
});