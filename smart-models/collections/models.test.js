import test from 'ava';
import { LmStudioEmbeddingModelAdapter } from '../adapters/embedding/lm_studio.js';
import { OllamaEmbeddingModelAdapter } from '../adapters/embedding/ollama.js';
import { OpenAIEmbeddingModelAdapter } from '../adapters/embedding/openai.js';
import {
  OpenRouterEmbeddingModelAdapter,
  settings_config as open_router_settings_config,
} from '../adapters/embedding/open_router.js';
import { EmbeddingModel } from '../items/embedding_model.js';
import { EmbeddingModels } from './embedding_models.js';

class TestModel {
  constructor(env, data = {}) {
    this.env = env;
    this.data = {
      provider_key: 'transformers',
      model_key: 'TaylorAI/bge-micro-v3',
      ...data,
    };
    this.provider_key = this.data.provider_key;
    this.key = `${this.provider_key}#test`;
  }

  queue_save() {
    this.queued_save = true;
  }
}

function create_collection(providers) {
  return {
    env: {},
    env_config: { providers },
    item_type: TestModel,
    filter() {
      return [];
    },
    set(item) {
      this.item = item;
    },
    emit_event() {},
  };
}

function create_model_collection(providers, HttpAdapterClass = class {}) {
  const env = {
    config: {
      actions: {},
      collections: {
        embedding_models: { providers },
      },
      modules: {
        http_adapter: { class: HttpAdapterClass },
      },
    },
    opts: { items: {}, collections: {} },
    settings: {},
    collections: {},
    events: {
      emit() {},
      once() {},
    },
    create_env_getter(target) {
      Object.defineProperty(target, 'env', {
        value: env,
        configurable: true,
      });
    },
  };
  const collection = new EmbeddingModels(env, {
    collection_key: 'embedding_models',
    item_type: EmbeddingModel,
  });
  collection.emit_event = () => {};
  collection.process_save_queue = async () => {};
  return { env, collection };
}

test('new LM Studio embedding models do not inherit the Transformers model key', (t) => {
  const collection = create_collection({
    lm_studio: { class: LmStudioEmbeddingModelAdapter },
  });

  const model = EmbeddingModels.prototype.new_model.call(collection, {
    provider_key: 'lm_studio',
  });

  t.is(model.data.model_key, '');
});

test('new Ollama embedding models do not inherit the Transformers model key', (t) => {
  const collection = create_collection({
    ollama: { class: OllamaEmbeddingModelAdapter },
  });

  const model = EmbeddingModels.prototype.new_model.call(collection, {
    provider_key: 'ollama',
  });

  t.is(model.data.model_key, '');
});

test('new embedding models use the selected provider default model key', (t) => {
  class TransformersAdapter {
    static defaults = {
      default_model: 'TaylorAI/bge-micro-v3',
    };
  }

  const collection = create_collection({
    transformers: { class: TransformersAdapter },
  });

  const model = EmbeddingModels.prototype.new_model.call(collection, {
    provider_key: 'transformers',
  });

  t.is(model.data.model_key, 'TaylorAI/bge-micro-v3');
});

test('credential-free providers do not copy legacy API key data', (t) => {
  const local_providers = [
    ['lm_studio', LmStudioEmbeddingModelAdapter],
    ['ollama', OllamaEmbeddingModelAdapter],
  ];

  for (const [provider_key, AdapterClass] of local_providers) {
    const { env, collection } = create_model_collection({
      [provider_key]: { class: AdapterClass, settings_config: {} },
    });
    const legacy_model = new EmbeddingModel(env, {
      key: `${provider_key}#legacy`,
      provider_key,
      model_key: '',
      api_key: 'na',
      api_key_is_credential_id: true,
      secret_source_key: `${provider_key}#source`,
      created_at: 1,
    });
    collection.set(legacy_model);

    const next_model = collection.new_model({
      provider_key,
      api_key: 'ignored',
      api_key_is_credential_id: true,
      secret_source_key: legacy_model.key,
    });

    // LEGACY: existing placeholders are intentionally left for migration.
    t.is(legacy_model.data.api_key, 'na');
    t.false(Object.prototype.hasOwnProperty.call(next_model.data, 'api_key'));
    t.false(Object.prototype.hasOwnProperty.call(next_model.data, 'api_key_is_credential_id'));
    t.false(Object.prototype.hasOwnProperty.call(next_model.data, 'secret_source_key'));
    t.is(next_model.api_key, '');
  }
});

test('legacy non-credential models store raw API keys in model data', (t) => {
  const { collection } = create_model_collection({
    openai: {
      class: OpenAIEmbeddingModelAdapter,
      settings_config: {
        api_key: { type: 'password' },
      },
    },
  });

  const model = collection.new_model({
    provider_key: 'openai',
    api_key: 'legacy-key',
  });

  t.false('secrets' in model);
  t.false('secrets' in collection);
  t.is(model.data.api_key, 'legacy-key');
  t.is(model.api_key, 'legacy-key');

  model.api_key = 'updated-key';
  t.is(model.data.api_key, 'updated-key');
});

test('new OpenAI embedding models can be tested before changing model key', async (t) => {
  const endpoint = 'https://api.openai.com/v1/embeddings';
  let request_url = '';

  class TestHttpAdapter {
    async request(params) {
      request_url = params.url;
      if (request_url !== endpoint) {
        throw new Error(`Unexpected OpenAI endpoint: ${String(request_url)}`);
      }
      return {
        async json() {
          return {
            data: [{ embedding: new Array(512).fill(0.1) }],
            usage: { total_tokens: 2 },
          };
        },
        status() {
          return 200;
        },
      };
    }
  }

  const { collection } = create_model_collection({
    openai: {
      class: OpenAIEmbeddingModelAdapter,
      settings_config: {
        api_key: { type: 'password' },
      },
    },
  }, TestHttpAdapter);
  const model = collection.new_model({
    provider_key: 'openai',
    api_key: 'test-key',
  });
  const adapter = model.instance;
  adapter.count_tokens = async () => ({ tokens: 2 });

  const result = await model.test_model();

  t.is(model.data.model_key, 'text-embedding-3-small');
  t.is(model.data.endpoint, endpoint);
  t.is(request_url, endpoint);
  t.true(result.success);
});

test('new credential-backed model reuses the latest selected credential ID', (t) => {
  const models = [
    new TestModel({}, {
      provider_key: 'openai',
      api_key: 'openai-personal',
      api_key_is_credential_id: true,
      created_at: 1,
    }),
    new TestModel({}, {
      provider_key: 'openai',
      api_key: '',
      api_key_is_credential_id: true,
      created_at: 2,
    }),
  ];
  const collection = {
    env: {},
    env_config: {
      api_key_is_credential_id: true,
      providers: {
        openai: {
          settings_config: {
            api_key: { type: 'password' },
          },
        },
      },
    },
    item_type: TestModel,
    filter(callback) {
      return models.filter(callback);
    },
    set(item) {
      models.push(item);
      this.item = item;
    },
    emit_event() {},
  };

  const model = EmbeddingModels.prototype.new_model.call(collection, {
    provider_key: 'openai',
  });

  t.true(model.data.api_key_is_credential_id);
  t.is(model.data.api_key, 'openai-personal');
});

test('explicit credential ID overrides same-provider reuse', (t) => {
  const existing_model = new TestModel({}, {
    provider_key: 'openai',
    api_key: 'openai-personal',
    api_key_is_credential_id: true,
    created_at: 1,
  });
  const collection = {
    env: {},
    env_config: {
      api_key_is_credential_id: true,
      providers: {
        openai: {
          settings_config: {
            api_key: { type: 'password' },
          },
        },
      },
    },
    item_type: TestModel,
    filter(callback) {
      return [existing_model].filter(callback);
    },
    set(item) {
      this.item = item;
    },
    emit_event() {},
  };
  const input = {
    provider_key: 'openai',
    api_key: 'openai-work',
  };

  const model = EmbeddingModels.prototype.new_model.call(collection, input);

  t.is(model.data.api_key, 'openai-work');
  t.true(model.data.api_key_is_credential_id);
  t.deepEqual(input, {
    provider_key: 'openai',
    api_key: 'openai-work',
    model_key: '',
  });
});

test('credential-backed model resolves the selected ID and preserves provider settings', (t) => {
  const { env, collection } = create_model_collection({
    openai: {
      class: OpenAIEmbeddingModelAdapter,
      settings_config: {
        api_key: {
          name: 'API Key',
          type: 'secret',
          description: 'Configured by the platform.',
        },
      },
    },
  });
  env.config.collections.embedding_models.api_key_is_credential_id = true;
  env.get_secret_by_id = (credential_id) => {
    t.is(credential_id, 'openai-work');
    return 'resolved-key';
  };

  const model = collection.new_model({
    provider_key: 'openai',
    api_key: 'openai-work',
  });

  t.is(model.api_key, 'resolved-key');
  t.is(model.settings_config.api_key.type, 'secret');
  t.is(
    model.settings_config.api_key.description,
    'Configured by the platform.',
  );
  t.false(Object.prototype.hasOwnProperty.call(model.settings_config.api_key, 'secret'));
  t.throws(
    () => {
      model.api_key = 'raw-key';
    },
    { message: 'Set the model credential ID through model settings.' },
  );
});

test('model settings do not infer a secret control from model data', (t) => {
  const { env, collection } = create_model_collection({
    openai: {
      class: OpenAIEmbeddingModelAdapter,
      settings_config: {
        api_key: {
          name: 'API Key',
          type: 'password',
        },
      },
    },
  });
  env.config.collections.embedding_models.api_key_is_credential_id = true;
  env.get_secret_by_id = () => 'resolved-key';

  const model = collection.new_model({
    provider_key: 'openai',
    api_key: 'openai-work',
  });

  t.is(model.settings_config.api_key.type, 'password');
});

test('legacy OpenRouter model key is upgraded to the provider-qualified ID', (t) => {
  const { env, collection } = create_model_collection({
    open_router: {
      class: OpenRouterEmbeddingModelAdapter,
      settings_config: open_router_settings_config,
    },
  });
  const model = new EmbeddingModel(env, {
    provider_key: 'open_router',
    model_key: 'text-embedding-3-small',
    provider_models: {
      'text-embedding-3-small': {
        description: 'OpenRouter embedding model',
      },
    },
  });
  collection.set(model);

  t.is(model.data.model_key, 'openai/text-embedding-3-small');
  t.false(Object.prototype.hasOwnProperty.call(
    model.data,
    'provider_models',
  ));
  t.true(model._queue_save);
});

test('OpenRouter model options refresh after selecting a credential', async (t) => {
  let models_request_count = 0;
  let embedding_request_count = 0;
  class TestHttpAdapter {
    async request(params) {
      if (params.url.endsWith('/embeddings/models')) {
        models_request_count += 1;
        return {
          async json() {
            return {
              data: [
                {
                  id: 'openai/text-embedding-3-small',
                  name: 'OpenAI: Text Embedding 3 Small',
                  context_length: 8191,
                },
                {
                  id: 'qwen/qwen3-embedding-8b',
                  name: 'Qwen: Qwen3 Embedding 8B',
                  context_length: 32768,
                },
              ],
            };
          },
        };
      }

      embedding_request_count += 1;
      const request_body = JSON.parse(params.body);
      const dims = request_body.model === 'qwen/qwen3-embedding-8b'
        ? 4096
        : 1536
      ;
      return {
        async json() {
          return {
            data: [{ embedding: new Array(dims).fill(0) }],
            usage: { total_tokens: 1 },
          };
        },
      };
    }
  }

  const { env, collection } = create_model_collection({
    open_router: {
      class: OpenRouterEmbeddingModelAdapter,
      settings_config: open_router_settings_config,
    },
  }, TestHttpAdapter);
  env.config.collections.embedding_models.api_key_is_credential_id = true;
  env.get_secret_by_id = (credential_id) => {
    return credential_id === 'openrouter-work'
      ? 'resolved-openrouter-key'
      : ''
    ;
  };
  const model = collection.new_model({ provider_key: 'open_router' });

  const before_selection = await model.get_model_key_options();
  t.deepEqual(before_selection, [{
    label: 'openai/text-embedding-3-small',
    value: 'openai/text-embedding-3-small',
  }]);
  t.is(models_request_count, 0);
  t.is(embedding_request_count, 0);

  model.settings.api_key = 'openrouter-work';
  model.model_changed('api_key', 'openrouter-work');
  const after_selection = await model.get_model_key_options();

  t.deepEqual(after_selection, [
    {
      label: 'openai/text-embedding-3-small',
      value: 'openai/text-embedding-3-small',
    },
    {
      label: 'qwen/qwen3-embedding-8b',
      value: 'qwen/qwen3-embedding-8b',
    },
  ]);
  t.is(models_request_count, 1);
  t.is(embedding_request_count, 1);
  t.is(model.data.max_tokens, 8191);
  t.is(model.data.dims, 1536);

  model.settings.model_key = 'qwen/qwen3-embedding-8b';
  // The focused test event stub does not run Model.instance's one-time
  // model:changed listener, so mirror the production instance reset here.
  model._instance = null;
  await model.settings_config.model_key.callback.call(
    model,
    'qwen/qwen3-embedding-8b',
  );

  t.is(model.data.api_key, 'openrouter-work');
  t.is(model.api_key, 'resolved-openrouter-key');
  t.is(model.data.model_key, 'qwen/qwen3-embedding-8b');
  t.is(model.data.max_tokens, 32768);
  t.is(model.data.dims, 4096);
  t.is(
    model.data.provider_models['qwen/qwen3-embedding-8b'].dims,
    4096,
  );
  t.deepEqual(await model.get_model_key_options(), after_selection);
  t.is(models_request_count, 1);
  t.is(embedding_request_count, 2);
});
