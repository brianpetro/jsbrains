import test from 'ava';
import { SmartEmbedOpenRouterAdapter } from './open_router.js';

function create_adapter({
  api_key = '',
  model_key = '',
  provider_models,
} = {}) {
  let save_count = 0;
  const model = {
    api_key,
    model_key,
    data: {
      model_key,
      dims: 384,
      max_tokens: 8191,
      endpoint: SmartEmbedOpenRouterAdapter.defaults.endpoint,
      ...(provider_models ? { provider_models } : {}),
    },
    queue_save() {
      save_count += 1;
    },
  };
  const adapter = new SmartEmbedOpenRouterAdapter(model);
  return {
    adapter,
    model,
    get_save_count() {
      return save_count;
    },
  };
}

test('missing credential returns fallback without caching it', async (t) => {
  const { adapter, model } = create_adapter();

  const models = await adapter.get_models();

  t.deepEqual(Object.keys(models), ['openai/text-embedding-3-small']);
  t.false(Object.prototype.hasOwnProperty.call(model.data, 'provider_models'));
});

test('configured credential fetches and caches the embeddings endpoint', async (t) => {
  const { adapter, model } = create_adapter({
    api_key: 'resolved-openrouter-key',
  });
  let request_count = 0;
  adapter._http_adapter = {
    async request(params) {
      request_count += 1;
      t.is(params.url, 'https://openrouter.ai/api/v1/embeddings/models');
      t.is(params.headers.Authorization, 'Bearer resolved-openrouter-key');
      return {
        ok: true,
        async json() {
          return {
            data: [
              {
                id: 'openai/text-embedding-3-small',
                name: 'Text Embedding 3 Small',
                description: 'OpenAI embedding model.',
                context_length: 8192,
              },
              {
                id: 'vendor/vector-v1',
                name: 'Vector V1',
                context_length: 32768,
              },
            ],
          };
        },
      };
    },
  };

  const models = await adapter.get_models();

  t.is(request_count, 1);
  t.deepEqual(Object.keys(models), [
    'openai/text-embedding-3-small',
    'vendor/vector-v1',
  ]);
  t.deepEqual(model.data.provider_models, models);
  t.is(models['openai/text-embedding-3-small'].max_tokens, 8192);
  t.is(models['vendor/vector-v1'].max_tokens, 32768);
  t.false(Object.prototype.hasOwnProperty.call(models, '_'));
});

test('fetching models syncs metadata for the selected model', async (t) => {
  const { adapter, model } = create_adapter({
    api_key: 'resolved-openrouter-key',
    model_key: 'openai/text-embedding-3-small',
  });
  let models_request_count = 0;
  let embedding_request_count = 0;
  adapter._http_adapter = {
    async request(params) {
      if (params.url.endsWith('/embeddings/models')) {
        models_request_count += 1;
        return {
          ok: true,
          async json() {
            return {
              data: [{
                id: 'openai/text-embedding-3-small',
                context_length: '8192',
              }],
            };
          },
        };
      }

      embedding_request_count += 1;
      return {
        async json() {
          return {
            data: [{ embedding: new Array(1536).fill(0) }],
            usage: { total_tokens: 1 },
          };
        },
      };
    },
  };

  await adapter.get_models();

  t.is(models_request_count, 1);
  t.is(embedding_request_count, 1);
  t.is(model.data.max_tokens, 8192);
  t.is(model.data.dims, 1536);
  t.is(
    model.data.provider_models['openai/text-embedding-3-small'].dims,
    1536,
  );
});

test('load stores selected max tokens and dimensions from one embedding', async (t) => {
  const provider_models = {
    'qwen/qwen3-embedding-8b': {
      id: 'qwen/qwen3-embedding-8b',
      max_tokens: 32768,
    },
  };
  const { adapter, model, get_save_count } = create_adapter({
    api_key: 'resolved-openrouter-key',
    model_key: 'qwen/qwen3-embedding-8b',
    provider_models,
  });
  let embed_count = 0;
  adapter.embed_batch = async () => {
    embed_count += 1;
    return [{ vec: new Array(4096).fill(0) }];
  };

  await Promise.all([adapter.load(), adapter.load()]);

  t.is(embed_count, 1);
  t.is(model.data.max_tokens, 32768);
  t.is(model.data.dims, 4096);
  t.is(provider_models['qwen/qwen3-embedding-8b'].dims, 4096);
  t.is(get_save_count(), 1);
  t.true(adapter.is_loaded);
});

test('load reuses cached dimensions without another embedding', async (t) => {
  const provider_models = {
    'qwen/qwen3-embedding-8b': {
      id: 'qwen/qwen3-embedding-8b',
      max_tokens: 32768,
      dims: 4096,
    },
  };
  const { adapter, model, get_save_count } = create_adapter({
    api_key: 'resolved-openrouter-key',
    model_key: 'qwen/qwen3-embedding-8b',
    provider_models,
  });
  adapter.embed_batch = async () => {
    t.fail('cached dimensions should avoid a test embedding');
  };

  await adapter.load();

  t.is(model.data.max_tokens, 32768);
  t.is(model.data.dims, 4096);
  t.is(get_save_count(), 1);
  t.true(adapter.is_loaded);
});

test('legacy underscore cache is discarded and replaced', async (t) => {
  const { adapter, model, get_save_count } = create_adapter({
    api_key: 'resolved-openrouter-key',
    provider_models: {
      _: { id: 'No embedding models found.' },
    },
  });
  let request_count = 0;
  adapter._http_adapter = {
    async request() {
      request_count += 1;
      return {
        ok: true,
        async json() {
          return {
            data: [{
              id: 'openai/text-embedding-3-small',
              name: 'Text Embedding 3 Small',
              context_length: 8192,
            }],
          };
        },
      };
    },
  };

  const models = await adapter.get_models();

  t.is(request_count, 1);
  t.is(get_save_count(), 1);
  t.deepEqual(Object.keys(models), ['openai/text-embedding-3-small']);
  t.false(Object.prototype.hasOwnProperty.call(model.data.provider_models, '_'));
});

test('empty response uses fallback without caching an underscore placeholder', async (t) => {
  const { adapter, model } = create_adapter({
    api_key: 'resolved-openrouter-key',
  });
  adapter._http_adapter = {
    async request() {
      return {
        ok: true,
        async json() {
          return { data: [] };
        },
      };
    },
  };

  const models = await adapter.get_models();

  t.deepEqual(Object.keys(models), ['openai/text-embedding-3-small']);
  t.false(Object.prototype.hasOwnProperty.call(models, '_'));
  t.false(Object.prototype.hasOwnProperty.call(model.data, 'provider_models'));
});

test('valid cached models avoid another request', async (t) => {
  const provider_models = {
    'openai/text-embedding-3-small': {
      id: 'openai/text-embedding-3-small',
      name: 'Text Embedding 3 Small',
    },
  };
  const { adapter } = create_adapter({
    api_key: 'resolved-openrouter-key',
    provider_models,
  });
  adapter._http_adapter = {
    async request() {
      t.fail('cached models should not trigger a request');
    },
  };

  const models = await adapter.get_models();

  t.is(models, provider_models);
});
