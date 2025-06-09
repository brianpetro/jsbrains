import test from 'ava';
import { CollectionItem } from '../item.js';

class TestItem extends CollectionItem {}

const greet_default_export = {
  key: 'greet',
  action: function() {
    return `hello ${this.data.name}`;
  },
}

function create_env() {
  const env = { config: { collections: {} }, create_env_getter(obj) { Object.defineProperty(obj, 'env', { value: env }); } };
  env.config.collections.test = {
    items: {
      test_item: {
        actions: {
          greet_default_export
        }
      }
    }
  };
  return env;
}

test('actions getter binds config actions', t => {
  const env = create_env();
  const item = new TestItem(env, { name: 'World' });
  t.is(item.actions.greet(), 'hello World');
});
