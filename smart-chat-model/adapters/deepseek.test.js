import test from 'ava';
import { SmartChatModel } from '../smart_chat_model.js';
import { SmartChatModelDeepseekAdapter } from './deepseek.js';

const test_model = new SmartChatModel({
  settings: {
    adapter: 'deepseek',
    deepseek: {
      api_key: 'test_api_key',
      model_key: 'deepseek-base'
    }
  },
  adapters: {
    deepseek: SmartChatModelDeepseekAdapter
  }
});

test('SmartChatModelDeepseekAdapter basic config check', t => {
  const adapter = test_model.adapter;
  t.is(adapter.constructor.key, 'deepseek');
  t.is(adapter.constructor.defaults.endpoint, 'https://api.deepseek.ai/v1/chat/completions');
  t.true(adapter.constructor.defaults.streaming);
});

test('SmartChatModelDeepseekAdapter parse_model_data', t => {
  const raw = {
    data: [
      { id: 'deepseek-base', context_size: 8192, description: 'Base Model' },
      { id: 'deepseek-pro', context_size: 16384, description: 'Pro Model' }
    ]
  };
  const parsed = test_model.adapter.parse_model_data(raw);
  t.truthy(parsed['deepseek-base']);
  t.is(parsed['deepseek-base'].model_name, 'deepseek-base');
  t.is(parsed['deepseek-base'].description, 'Base Model');
  t.is(parsed['deepseek-base'].max_input_tokens, 8192);

  t.truthy(parsed['deepseek-pro']);
  t.is(parsed['deepseek-pro'].model_name, 'deepseek-pro');
  t.is(parsed['deepseek-pro'].max_input_tokens, 16384);
});

test('SmartChatModelDeepseekAdapter count_tokens rough estimate', async t => {
  const text = 'Hello DeepSeek!';
  const n = await test_model.count_tokens(text);
  // 16 chars => 16/4 => 4 tokens (rounded up)
  t.is(n, 4);
});

test('SmartChatModelDeepseekAdapter complete request success (mock)', async t => {
  // This is a mock test, no actual network call
  const adapter = test_model.adapter;
  // simulate final response
  const mock_http = {
    request: async (params) => {
      return {
        json: async () => ({
          id: 'deepseek-res-123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'deepseek-base',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Mocked DeepSeek response.' },
              finish_reason: 'stop'
            }
          ],
          usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 }
        })
      };
    }
  };
  adapter._http_adapter = mock_http;

  const response = await test_model.complete({
    messages: [{ role: 'user', content: 'Hello DeepSeek?' }]
  });
  t.is(response.object, 'chat.completion');
  t.is(response.choices[0].message.content, 'Mocked DeepSeek response.');
  t.is(response.choices[0].message.role, 'assistant');
  t.is(response.usage.total_tokens, 12);
});

