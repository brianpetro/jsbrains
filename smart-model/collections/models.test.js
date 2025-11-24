import test from 'ava';
import { Models } from './models.js';
import Model from '../items/model.js';

function create_env(settings = {}) {
  const env = { settings };
  env.create_env_getter = (obj) => {
    Object.defineProperty(obj, 'env', { value: env });
  };
  return env;
}

test('get_model_settings favors overrides then collection settings', (t) => {
  const env = create_env({ model_configs: { chat_model: { adapter: 'chat_setting' } } });
  const collection = new Models(env, { item_type: Model });

  t.deepEqual(collection.get_model_settings('chat', { adapter: 'override' }), { adapter: 'override' });
  t.deepEqual(collection.get_model_settings('chat'), { adapter: 'chat_setting' });
  t.is(collection.get_model_settings('embed'), undefined);
});
