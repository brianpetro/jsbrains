import test from 'ava';
import {
  SmartChatModelGeminiAdapter,
  SmartChatModelGoogleAdapter,
} from './google.js';

function create_google_adapter(api_key = 'test_api_key') {
  return new SmartChatModelGoogleAdapter({
    api_key,
    model_key: 'gemini-test',
    data: {},
    opts: {},
    re_render_settings() {},
  });
}

function create_model(name, supported_generation_methods = ['generateContent']) {
  return {
    name: `models/${name}`,
    description: `${name} model`,
    inputTokenLimit: 1000,
    outputTokenLimit: 2000,
    supportedGenerationMethods: supported_generation_methods,
  };
}

test('Google model parsing keeps only compatible text chat models', t => {
  const adapter = create_google_adapter();
  const model_data = {
    models: [
      {
        ...create_model('gemini-3.6-flash'),
        outputTokenLimit: 65536,
        maxOutputTokens: 1,
      },
      create_model('gemini-3.1-pro-preview-customtools'),
      create_model('gemini-3.5-flash'),
      create_model('gemini-3.5-flash-lite'),
      create_model('gemini-3.1-flash-lite'),
      create_model('gemini-flash-latest'),
      create_model('gemini-flash-lite-latest'),
      create_model('gemini-pro-latest'),
      create_model('gemini-2.5-flash'),
      create_model('gemini-2.5-pro'),
      create_model('gemini-3.5-live-translate-preview'),
      create_model('gemini-3.1-flash-live-preview'),
      create_model('gemini-3.1-flash-tts-preview'),
      create_model('gemini-3.1-flash-image'),
      create_model('gemini-3.1-flash-lite-image'),
      create_model('gemini-3-pro-image'),
      create_model('gemini-omni-flash-preview'),
      create_model('gemini-robotics-er-2-preview'),
      create_model('gemini-3.7-flash-video-understanding-eap'),
      create_model('gemini-embedding-001', ['embedContent']),
      create_model('gemini-no-methods', []),
      create_model('imagen-4.0-generate'),
    ],
  };

  const models = adapter.parse_model_data(model_data);

  t.deepEqual(Object.keys(models), [
    'gemini-3.6-flash',
    'gemini-3.1-pro-preview-customtools',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-pro-latest',
  ]);
  t.is(models['gemini-3.6-flash'].max_input_tokens, 1000);
  t.is(models['gemini-3.6-flash'].max_output_tokens, 65536);
});

test.serial('Google model loading fetches every models.list page', async t => {
  const adapter = create_google_adapter('pagination_api_key');
  const request_urls = [];

  adapter.get_enriched_model_data = async () => adapter.model_data;
  adapter._http_adapter = {
    async request(request_params) {
      request_urls.push(request_params.url);

      if(request_params.url.includes('pageToken=next%20page')) {
        return {
          async json() {
            return {
              models: [create_model('gemini-second-page')],
            };
          },
        };
      }

      return {
        async json() {
          return {
            models: [create_model('gemini-first-page')],
            nextPageToken: 'next page',
          };
        },
      };
    },
  };

  const models = await adapter.get_models(true);

  t.deepEqual(Object.keys(models), [
    'gemini-first-page',
    'gemini-second-page',
  ]);
  t.is(request_urls.length, 2);
  t.true(request_urls[0].includes('pageSize=1000'));
  t.true(request_urls[1].includes('pageToken=next%20page'));
});

test('models.dev only enriches provider-eligible Google models', async t => {
  const adapter = create_google_adapter('enrichment_api_key');
  adapter.model_data = {
    'gemini-provider-model': {
      id: 'gemini-provider-model',
      model_name: 'gemini-provider-model',
    },
  };
  adapter.get_models_dev_index = async () => ({
    google: {
      models: {
        'gemini-provider-model': {
          name: 'Provider model',
          limit: { context: 32000, output: 8000 },
          modalities: { input: ['text'] },
        },
        'gemini-external-only': {
          name: 'External-only model',
          limit: { context: 64000, output: 16000 },
          modalities: { input: ['text'] },
        },
      },
    },
  });

  const models = await adapter.get_enriched_model_data();

  t.deepEqual(Object.keys(models), ['gemini-provider-model']);
  t.is(models['gemini-provider-model'].name, 'Provider model');
  t.is(models['gemini-provider-model'].max_input_tokens, 32000);
  t.false(Object.hasOwn(models, 'gemini-external-only'));

  adapter.model_data = {};
  t.deepEqual(await adapter.get_enriched_model_data(), {});
});

test('model cache is scoped by API credential', t => {
  const adapter = create_google_adapter('cache_api_key_a');
  adapter.model_data = {
    'gemini-cache-a': { id: 'gemini-cache-a' },
  };

  adapter.model.api_key = 'cache_api_key_b';
  adapter.model_data = {};
  t.deepEqual(adapter.model_data, {});

  adapter.model.api_key = 'cache_api_key_a';
  t.truthy(adapter.model_data['gemini-cache-a']);
});

test('Google adapters do not hardcode an obsolete default model', t => {
  t.is(SmartChatModelGoogleAdapter.defaults.default_model, '');
  t.is(SmartChatModelGeminiAdapter.defaults.default_model, '');
});
