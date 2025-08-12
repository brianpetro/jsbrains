import test from 'ava';
import dotenv from 'dotenv';
import { SmartChatModel } from '../smart_chat_model.js';
import { SmartChatModelGoogleAdapter, SmartChatModelGeminiRequestAdapter, SmartChatModelGeminiResponseAdapter } from './google.js';

dotenv.config({ path: '../.env' });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Create an instance of SmartChatModel
const smart_chat_model = new SmartChatModel({
  settings: {
    adapter: 'gemini',
    google_gemini: {
      api_key: 'test_api_key',
      model_key: 'gemini-pro',
    }
  },
  adapters: {
    google_gemini: SmartChatModelGoogleAdapter
  }
});

test('SmartChatModelGeminiRequestAdapter converts OpenAI request to Gemini schema', t => {
  const openai_request = {
    model: 'gemini-pro',
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

  const request_adapter = new SmartChatModelGeminiRequestAdapter(smart_chat_model.adapter, openai_request);
  const gemini_request = request_adapter.to_gemini();

  t.is(gemini_request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=test_api_key');
  t.is(gemini_request.method, 'POST');
  t.deepEqual(gemini_request.headers, {
    'Content-Type': 'application/json',
  });

  const body = JSON.parse(gemini_request.body);
  t.is(body.generationConfig.maxOutputTokens, 1000);
  t.is(body.generationConfig.temperature, 0.7);
  t.falsy(body.temperature);
  t.deepEqual(body.contents, [
    { role: 'user', parts: [{ text: 'You are a helpful assistant.' }] },
    { role: 'user', parts: [{ text: 'Hello, how are you?' }] },
    { role: 'model', parts: [{ text: 'I\'m doing well, thank you for asking! How can I assist you today?' }] },
    { role: 'user', parts: [{ text: 'What\'s the weather like?' }] }
  ]);
  t.deepEqual(body.tools, [{
    function_declarations: [{
      name: 'get_weather',
      description: 'Get weather information for a location',
      parameters: openai_request.tools[0].function.parameters
    }]
  }]);
});

test('SmartChatModelGeminiRequestAdapter handles multimodal content', t => {
  const openai_request = {
    model: 'gemini-pro-vision',
    messages: [
      { role: 'user', content: [
        { type: 'text', text: 'What\'s in this image?' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA...' } }
      ] }
    ],
    max_tokens: 500,
    temperature: 0.8
  };

  const request_adapter = new SmartChatModelGeminiRequestAdapter(smart_chat_model.adapter, openai_request);
  const gemini_request = request_adapter.to_gemini();

  const body = JSON.parse(gemini_request.body);
  t.deepEqual(body.contents[0], {
    role: 'user',
    parts: [
      { text: 'What\'s in this image?' },
      { inline_data: { mime_type: 'image/jpeg', data: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA...' } }
    ]
  });
});

test('SmartChatModelGeminiResponseAdapter converts Gemini response to OpenAI schema', t => {
  const gemini_response = {
    candidates: [{
      content: {
        parts: [
          { text: 'The weather in New York is currently sunny with a temperature of 72°F (22°C).' },
          {
            functionCall: {
              name: 'get_weather',
              args: {
                location: 'New York',
                unit: 'fahrenheit'
              }
            }
          }
        ]
      },
      finishReason: 'STOP'
    }],
    promptFeedback: {
      safetyRatings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' }
      ]
    },
    usageMetadata: {
      promptTokenCount: 20,
      candidatesTokenCount: 30,
      totalTokenCount: 50
    }
  };

  const response_adapter = new SmartChatModelGeminiResponseAdapter(smart_chat_model.adapter, gemini_response);
  const openai_response = response_adapter.to_openai();

  t.is(openai_response.object, 'chat.completion');
  t.truthy(openai_response.created);
  t.deepEqual(openai_response.choices[0].message, {
    role: 'assistant',
    content: 'The weather in New York is currently sunny with a temperature of 72°F (22°C).',
    tool_calls: [{
      type: 'function',
      function: {
        name: 'get_weather',
        arguments: JSON.stringify({
          location: 'New York',
          unit: 'fahrenheit'
        })
      }
    }]
  });
  t.is(openai_response.choices[0].finish_reason, 'stop');
  t.deepEqual(openai_response.usage, {
    prompt_tokens: 20,
    completion_tokens: 30,
    total_tokens: 50
  });
});

test.serial('Live Google Gemini Integration Test', async t => {
  if (!GOOGLE_API_KEY) {
    t.fail('Skipping live test: No Google API key found in .env');
    return;
  }

  const smart_chat_model = new SmartChatModel({
    settings: {
      platform_key: 'google_gemini',
      google_gemini: {
        api_key: GOOGLE_API_KEY,
        model_key: 'gemini-pro',
      }
    },
    adapters: {
      google_gemini: SmartChatModelGoogleAdapter
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

test.serial('Live Google Gemini get_models Integration Test', async t => {
  if (!GOOGLE_API_KEY) {
    t.pass('Skipping live test: No Google API key found in .env');
    return;
  }

  const smart_chat_model = new SmartChatModel({
    settings: {
      platform_key: 'google_gemini',
      google_gemini: {
        api_key: GOOGLE_API_KEY,
        model_key: 'gemini-pro',
      }
    },
    adapters: {
      google_gemini: SmartChatModelGoogleAdapter
    }
  });

  try {
    const models = await smart_chat_model.get_models();
    console.log(JSON.stringify(models, null, 2));
    t.true(Array.isArray(models));
    t.true(models.length > 0);
    t.true(models.every(model => 
      model.hasOwnProperty('model_name') &&
      model.hasOwnProperty('key') &&
      model.hasOwnProperty('max_input_tokens') &&
      model.hasOwnProperty('max_output_tokens') &&
      model.hasOwnProperty('description') &&
      model.hasOwnProperty('multimodal') &&
      model.hasOwnProperty('raw')
    ));
  } catch (error) {
    console.error(error);
    t.fail(`Live test failed: ${error.message}`);
  }
});