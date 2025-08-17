import test from 'ava';
import { SmartCompletion } from './smart_completion.js';

// minimal environment stub for CollectionItem
const make_env = () => ({
  create_env_getter(target) {
    Object.defineProperty(target, 'env', { value: this });
  },
  config: {},
  opts: { items: { smart_completion: {} } },
  settings: {},
  smart_settings: { save() {} },
  smart_completions: {
    item_class_name: 'SmartCompletion',
    completion_adapters: {},
  },
});

test('response getter reflects response_i index', t => {
  const env = make_env();
  const item = new SmartCompletion(env, {
    completion: {
      responses: [
        { text: 'first' },
        { text: 'second' }
      ]
    }
  });

  t.is(item.response.text, 'first');
  t.is(item.response_text, 'first');

  item.response_i = 1;
  t.is(item.response.text, 'second');
  t.is(item.response_text, 'second');
});
