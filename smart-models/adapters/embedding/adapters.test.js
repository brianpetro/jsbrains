import test from 'ava';

import { OpenAIEmbeddingModelAdapter } from './openai.js';
import { GoogleGeminiEmbeddingModelAdapter } from './gemini.js';
import { OpenRouterEmbeddingModelAdapter } from './open_router.js';
import { LmStudioEmbeddingModelAdapter } from './lm_studio.js';

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
        timeout: 123,
      },
    },
  },
};

const base_settings = {
  api_key: 'test-key',
  model_key: 'test-model',
};

const embedding_adapters = [
  OpenAIEmbeddingModelAdapter,
  GoogleGeminiEmbeddingModelAdapter,
  OpenRouterEmbeddingModelAdapter,
  LmStudioEmbeddingModelAdapter,
];

const build_model = (settings = {}) => ({
  settings: {
    ...base_settings,
    ...settings,
  },
  env: base_env,
});

test('embedding adapters expose model settings', t => {
  embedding_adapters.forEach(AdapterClass => {
    const model = build_model({
      model_key: 'custom-model',
      adapter_specific: AdapterClass.name,
    });
    const adapter = new AdapterClass(model);

    t.is(adapter.adapter_settings.model_key, 'custom-model');
    t.is(adapter.adapter_settings.adapter_specific, AdapterClass.name);
  });
});

test('embedding adapters reuse env-provided http adapter', t => {
  embedding_adapters.forEach(AdapterClass => {
    const adapter = new AdapterClass(build_model());

    const first_http = adapter.http_adapter;
    const second_http = adapter.http_adapter;

    t.true(first_http instanceof FakeHttpAdapter);
    t.is(first_http, second_http);
    t.is(first_http.opts.adapter, 'fetch');
    t.is(first_http.opts.timeout, 123);
  });
});
