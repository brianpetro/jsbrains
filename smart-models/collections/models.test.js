import test from 'ava';
import { LmStudioEmbeddingModelAdapter } from '../adapters/embedding/lm_studio.js';
import { OllamaEmbeddingModelAdapter } from '../adapters/embedding/ollama.js';
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

// Generic credential tests do not depend on any cloud provider implementation.
class TestProvider {
  load() {}
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
      class: TestProvider,
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
          class: TestProvider,
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
          class: TestProvider,
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
      class: TestProvider,
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
      class: TestProvider,
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


test('unregistered providers are rejected before creating or saving a model', (t) => {
  const { collection } = create_model_collection({});
  let events = 0;
  collection.emit_event = () => { events += 1; };

  t.throws(() => collection.new_model({ provider_key: 'openai' }), {
    message: 'Model provider unavailable: openai',
  });
  t.deepEqual(collection.items, {});
  t.is(events, 0);
  t.falsy(collection.settings.default_model_key);
});

test('an unavailable default fails without recursively creating models', (t) => {
  const { collection } = create_model_collection({});

  for (let attempt = 0; attempt < 2; attempt++) {
    t.throws(() => collection.default, {
      message: 'Model provider unavailable: transformers',
    });
    t.deepEqual(collection.items, {});
    t.falsy(collection.settings.default_model_key);
  }
});

test('an unavailable saved default is preserved even when a local provider exists', (t) => {
  const { env, collection } = create_model_collection({
    transformers: { class: TestProvider },
  });
  const model = new EmbeddingModel(env, {
    key: 'openai#saved',
    provider_key: 'openai',
    model_key: 'text-embedding-3-small',
    dims: 512,
    api_key: 'openai-work',
    api_key_is_credential_id: true,
  });
  collection.set(model);
  collection.settings.default_model_key = model.key;
  const saved_data = structuredClone(model.data);
  let created = 0;
  collection.new_model = () => { created += 1; t.fail('must not substitute a model'); };

  t.is(collection.default, model);
  t.throws(() => collection.default.instance, {
    message: 'Model provider unavailable: openai',
  });
  t.deepEqual(model.data, saved_data);
  t.is(collection.settings.default_model_key, 'openai#saved');
  t.deepEqual(Object.keys(collection.items), ['openai#saved']);
  t.is(created, 0);

  // Registering Pro later must make the same saved item usable without a data migration.
  env.config.collections.embedding_models.providers.openai = { class: TestProvider };
  t.true(model.instance instanceof TestProvider);
  t.deepEqual(model.data, saved_data);
});

test('a configured default provider can still create its first model', (t) => {
  const { collection } = create_model_collection({
    transformers: { class: TestProvider },
  });
  const model = collection.default;

  t.is(model.provider_key, 'transformers');
  t.is(collection.settings.default_model_key, model.key);
  t.is(collection.default, model);
  t.is(Object.keys(collection.items).length, 1);
});
