import test from 'ava';
import {
  LmStudioEmbedModelAdapter,
  parse_lm_studio_models,
} from './lm_studio.js';
import { SmartEmbedOllamaAdapter } from './ollama.js';

function create_model(data = {}) {
  let queue_save_count = 0;

  return {
    data,
    model_key: data.model_key,
    queue_save() {
      queue_save_count += 1;
    },
    get queue_save_count() {
      return queue_save_count;
    },
  };
}

test('LM Studio load syncs dimensions from an actual embedding response', async (t) => {
  const model = create_model({
    model_key: 'local-embedding-model',
    dims: 384,
    provider_models: {
      'local-embedding-model': {},
    },
  });
  const adapter = new LmStudioEmbedModelAdapter(model);
  let embed_batch_count = 0;

  adapter.embed_batch = async () => {
    embed_batch_count += 1;
    return [{ vec: new Array(768) }];
  };

  await Promise.all([adapter.load(), adapter.load()]);

  t.is(embed_batch_count, 1);
  t.is(model.data.dims, 768);
  t.is(model.data.provider_models['local-embedding-model'].dims, 768);
  t.is(model.queue_save_count, 1);
  t.true(adapter.is_loaded);
});

test('LM Studio load does not probe dimensions before model selection', async (t) => {
  const model = create_model({
    model_key: '',
  });
  const adapter = new LmStudioEmbedModelAdapter(model);

  adapter.embed_batch = async () => {
    t.fail('dimensions must not be probed before a model is selected');
  };

  await adapter.load();

  t.true(adapter.is_loaded);
});


test('LM Studio first embedding model instance loads model options without probing an inherited model key', async (t) => {
  const model = create_model({
    model_key: 'TaylorAI/bge-micro-v2',
  });
  const adapter = new LmStudioEmbedModelAdapter(model);
  let request_count = 0;

  adapter.embed_batch = async () => {
    t.fail('an unavailable inherited model key must not be probed');
  };
  adapter._http_adapter = {
    async request() {
      request_count += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return {
        async json() {
          return {
            object: 'list',
            data: [{
              id: 'local-embedding-model',
              type: 'embeddings',
              max_context_length: 2048,
            }],
          };
        },
      };
    },
  };

  const [, models] = await Promise.all([
    adapter.load(),
    adapter.get_models(),
  ]);

  t.is(request_count, 1);
  t.is(models['local-embedding-model'].max_tokens, 2048);
  t.is(model.data.provider_models, models);
  t.true(adapter.is_loaded);
});

test('Ollama does not probe an inherited unavailable model key', async (t) => {
  const model = create_model({
    model_key: 'TaylorAI/bge-micro-v3',
  });
  const adapter = new SmartEmbedOllamaAdapter(model);

  adapter.get_models = async () => {
    adapter.model_data = {
      'local-embedding-model': {
        dims: 768,
        max_tokens: 2048,
      },
    };
    return adapter.model_data;
  };
  adapter.request = async () => {
    t.fail('an unavailable inherited model key must not be probed');
  };

  await adapter.load();

  t.true(adapter.is_loaded);
});

test('LM Studio gets models for embedding model items without legacy re-render', async (t) => {
  const model = create_model({
    model_key: '',
  });
  const adapter = new LmStudioEmbedModelAdapter(model);

  adapter._http_adapter = {
    async request() {
      return {
        async json() {
          return {
            object: 'list',
            data: [{
              id: 'local-embedding-model',
              type: 'embeddings',
              max_context_length: 2048,
            }],
          };
        },
      };
    },
  };

  const models = await adapter.get_models();

  t.is(models['local-embedding-model'].max_tokens, 2048);
  t.is(model.data.provider_models, models);
});

test('LM Studio model parsing uses the current max context field', (t) => {
  const models = parse_lm_studio_models({
    object: 'list',
    data: [{
      id: 'local-embedding-model',
      type: 'embeddings',
      max_context_length: 2048,
    }],
  });

  t.is(models['local-embedding-model'].max_tokens, 2048);
});

test('Ollama load persists discovered dimensions without emitting a model change', async (t) => {
  const model = create_model({
    model_key: 'nomic-embed-text',
    dims: 384,
    max_tokens: 512,
  });
  model.debounce_save = () => {
    t.fail('dimension metadata must not reset the active model adapter');
  };

  const adapter = new SmartEmbedOllamaAdapter(model);
  let get_models_count = 0;

  adapter.get_models = async () => {
    get_models_count += 1;
    adapter.model_data = {
      'nomic-embed-text': {
        dims: 768,
        max_tokens: 2048,
      },
    };
    return adapter.model_data;
  };

  await Promise.all([adapter.load(), adapter.load()]);

  t.is(get_models_count, 1);
  t.is(model.data.dims, 768);
  t.is(model.data.max_tokens, 2048);
  t.is(model.queue_save_count, 1);
  t.true(adapter.is_loaded);
});

test('Ollama load probes dimensions when model metadata omits embedding length', async (t) => {
  const model = create_model({
    model_key: 'custom-embed-model',
    dims: 384,
    max_tokens: 512,
  });
  const adapter = new SmartEmbedOllamaAdapter(model);
  let request_count = 0;

  adapter.get_models = async () => {
    adapter.model_data = {
      'custom-embed-model': {
        max_tokens: 1024,
      },
    };
    return adapter.model_data;
  };
  adapter.request = async () => {
    request_count += 1;
    return {
      embeddings: [new Array(1024)],
      prompt_eval_count: 1,
    };
  };

  await adapter.load();

  t.is(request_count, 1);
  t.is(adapter.model_data['custom-embed-model'].dims, 1024);
  t.is(model.data.dims, 1024);
  t.is(model.data.max_tokens, 1024);
  t.true(adapter.is_loaded);
});

test('LM Studio embeds without reading or sending an API key', async (t) => {
  const model = create_model({
    model_key: 'local-embedding-model',
    max_tokens: 512,
  });
  Object.defineProperty(model, 'api_key', {
    get() {
      t.fail('LM Studio must not read model API key storage');
    },
  });

  const adapter = new LmStudioEmbedModelAdapter(model);
  let request_headers;

  adapter.request = async (request_params) => {
    request_headers = request_params.headers;
    return {
      data: [{ embedding: [0.1, 0.2] }],
    };
  };

  const [result] = await adapter.embed_batch([{ embed_input: 'test' }]);

  t.is(request_headers.Authorization, undefined);
  t.is(result.vec.length, 2);
});

test('Ollama embeds without reading an API key', async (t) => {
  const model = create_model({
    model_key: 'local-embedding-model',
    max_tokens: 512,
  });
  Object.defineProperty(model, 'api_key', {
    get() {
      t.fail('Ollama must not read model API key storage');
    },
  });

  const adapter = new SmartEmbedOllamaAdapter(model);
  adapter.request = async () => ({
    embeddings: [[0.1, 0.2]],
    prompt_eval_count: 1,
  });

  const [result] = await adapter.embed_batch([{ embed_input: 'test' }]);

  t.is(result.vec.length, 2);
});

