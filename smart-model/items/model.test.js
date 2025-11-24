import test from 'ava';
import { Models } from '../collections/models.js';
import Model from './model.js';

function create_env(settings = {}) {
  const env = {
    collections: {},
    settings,
    config: {},
    opts: {},
  };
  env.create_env_getter = (obj) => {
    Object.defineProperty(obj, 'env', { value: env });
  };
  return env;
}

class StubModel {
  constructor(opts = {}) {
    this.opts = opts;
  }
}

class InitModel extends StubModel {
  async initialize() {
    this.initialized = true;
  }
}

test('init_model merges collection defaults, item config, and overrides', async (t) => {
  const env = create_env({ model_configs: { chat_model: { adapter: 'chat_setting' } } });
  const ChatAdapter = class {};
  const collection = new Models(env, {
    item_type: Model,
    model_classes: { chat: StubModel },
    model_opts: {
      chat: {
        adapters: { chat: ChatAdapter },
        settings: { adapter: 'base_adapter' },
        model_config: { adapter: 'chat', dims: 128 },
      },
    },
  });

  const item = collection.create_or_update({
    key: 'chat#1',
    model_type: 'chat',
    model_config: { adapter: 'item_adapter', model_key: 'item_key' },
  });

  const model = await item.init_model({
    model_config: { id: 'override' },
    model_key: 'override_key',
    opts: { hook: true },
  });

  t.true(model instanceof StubModel);
  t.deepEqual(model.opts.adapters, { chat: ChatAdapter });
  t.deepEqual(model.opts.settings, { adapter: 'chat_setting' });
  t.deepEqual(model.opts.model_config, {
    adapter: 'item_adapter',
    dims: 128,
    model_key: 'item_key',
    id: 'override',
  });
  t.is(model.opts.model_key, 'override_key');
  t.is(model.opts.model_type, 'chat');
  t.is(collection.model_opts.chat.model_config.adapter, 'chat');
});

test('init_model throws when model class is missing for type', async (t) => {
  const env = create_env();
  const collection = new Models(env, { item_type: Model });
  const item = new Model(env, { key: 'missing#1', model_type: 'embed', model_config: { adapter: 'none' } });
  collection.set(item);

  await t.throwsAsync(async () => item.init_model());
});

test('init_model waits for optional initialize hook', async (t) => {
  const env = create_env();
  const collection = new Models(env, {
    item_type: Model,
    model_classes: { chat: InitModel },
    model_opts: { chat: { adapters: { chat: class {} }, settings: { adapter: 'chat' }, model_config: { adapter: 'chat' } } },
  });
  const item = collection.create_or_update({ key: 'chat#init', model_config: { adapter: 'chat' } });

  const model = await item.init_model();

  t.true(model.initialized);
});
