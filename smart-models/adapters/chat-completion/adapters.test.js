import test from 'ava';

import { OpenAIChatCompletionModelAdapter } from './openai.js';
import { AnthropicChatCompletionModelAdapter } from './anthropic.js';
import { GoogleChatCompletionModelAdapter } from './google.js';
import { CohereChatCompletionModelAdapter } from './cohere.js';
import { OpenRouterChatCompletionModelAdapter } from './open_router.js';
import { OllamaChatCompletionModelAdapter } from './ollama.js';
import { LmStudioChatCompletionModelAdapter } from './lm_studio.js';
import { GroqChatCompletionModelAdapter } from './groq.js';
import { XaiChatCompletionModelAdapter } from './xai.js';
import { DeepseekChatCompletionModelAdapter } from './deepseek.js';

class FakeHttpAdapter {
  constructor(opts) {
    this.opts = opts;
  }
}

const base_env = {
  config: {
    modules: {
      http_adapter: {
        class: FakeHttpAdapter,
        adapter: 'fetch',
        retries: 2,
      },
    },
  },
};

const base_settings = {
  api_key: 'chat-key',
  model_key: 'chat-model',
};

const chat_adapters = [
  OpenAIChatCompletionModelAdapter,
  AnthropicChatCompletionModelAdapter,
  GoogleChatCompletionModelAdapter,
  CohereChatCompletionModelAdapter,
  OpenRouterChatCompletionModelAdapter,
  OllamaChatCompletionModelAdapter,
  LmStudioChatCompletionModelAdapter,
  GroqChatCompletionModelAdapter,
  XaiChatCompletionModelAdapter,
  DeepseekChatCompletionModelAdapter,
];

const build_model = (settings = {}) => ({
  settings: {
    ...base_settings,
    ...settings,
  },
  env: base_env,
});

test('chat adapters forward settings from model', t => {
  chat_adapters.forEach(AdapterClass => {
    const model = build_model({
      model_key: 'chat-specific',
      adapter_specific: AdapterClass.name,
    });
    const adapter = new AdapterClass(model);

    t.is(adapter.adapter_settings.model_key, 'chat-specific');
    t.is(adapter.adapter_settings.adapter_specific, AdapterClass.name);
  });
});

test('chat adapters construct http adapters from env config', t => {
  chat_adapters.forEach(AdapterClass => {
    const adapter = new AdapterClass(build_model());

    const created_http = adapter.http_adapter;

    t.true(created_http instanceof FakeHttpAdapter);
    t.is(adapter.http_adapter, created_http);
    t.is(created_http.opts.adapter, 'fetch');
    t.is(created_http.opts.retries, 2);
  });
});
