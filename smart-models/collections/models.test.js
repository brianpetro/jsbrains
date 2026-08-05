import test from 'ava';
import { LmStudioEmbeddingModelAdapter } from '../adapters/embedding/lm_studio.js';
import { OllamaEmbeddingModelAdapter } from '../adapters/embedding/ollama.js';
import { OpenAIEmbeddingModelAdapter } from '../adapters/embedding/openai.js';
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
    smart_secrets: { secrets: { embedding_models: {} } },
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

test('local embedding models clear legacy API key placeholders before reuse', (t) => {
  const local_providers = [
    ['lm_studio', LmStudioEmbeddingModelAdapter],
    ['ollama', OllamaEmbeddingModelAdapter],
  ];

  for (const [provider_key, AdapterClass] of local_providers) {
    for (const data_api_key of ['na', undefined]) {
      const { env, collection } = create_model_collection({
        [provider_key]: { class: AdapterClass, settings_config: {} },
      });
      const legacy_key = `${provider_key}#legacy`;
      env.smart_secrets.secrets.embedding_models[legacy_key] = {
        api_key: 'na',
      };

      const legacy_model = new EmbeddingModel(env, {
        key: legacy_key,
        provider_key,
        model_key: '',
        api_key: data_api_key,
        created_at: 1,
      });
      collection.set(legacy_model);
      const next_model = collection.new_model({ provider_key });

      t.is(legacy_model.data.api_key, undefined);
      t.is(legacy_model.secrets.api_key, '');
      t.is(next_model.api_key, '');
    }
  }
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
      settings_config: {},
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
