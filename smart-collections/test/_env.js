import { CollectionItem } from '../main.js';
import { Collection } from '../main.js';
import { TestSmartCollectionAdapter } from '../adapters/_test.js';
export function load_test_env(t) {
  const settings = {};
  const main = {};
  const env = {
    main,
    item_types: {
      CollectionItem,
    },
    // DEPRECATED in favor of calling Collection.load() directly
    // and accessing the collection constructor via collection.constructor as needed
    // collections: {
    //   collection: Collection,
    // },
    init: async () => {
      await Collection.load(env, { adapter_class: TestSmartCollectionAdapter });
    }
  };
  add_settings_getter_setter(main);
  add_settings_getter_setter(env);
  t.context.env = env;
  function add_settings_getter_setter(main) {
    Object.defineProperty(main, 'settings', {
      get() { return settings; },
      set(value) { settings = value; }
    });
  }
}