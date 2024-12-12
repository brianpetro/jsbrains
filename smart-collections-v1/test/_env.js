import { CollectionItem } from '../main.js';
import { Collection } from '../main.js';
import { JsonSingleFileCollectionDataAdapter } from '../adapters/json_single_file.js';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartEmbedModel } from '../../smart-embed-model/smart_embed_model.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
// import { SmartFsTestAdapter } from '../../smart-fs/adapters/_test.js';
import { NodeFsSmartFsAdapter } from 'smart-file-system/adapters/node_fs.js';

import { SmartSettings } from '../../smart-settings/smart_settings.js';
const __dirname = new URL('.', import.meta.url).pathname;

class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_config() {
    return {
      env_path: __dirname,
      modules: {
        smart_settings: {
          class: SmartSettings,
        },
        smart_fs: {
          class: SmartFs,
          // adapter: SmartFsTestAdapter,
          adapter: NodeFsSmartFsAdapter,
        }
      },
      collections: {
        collection: {
          class: Collection,
          data_adapter: JsonSingleFileCollectionDataAdapter,
        },
      },
      item_types: {
        CollectionItem,
      },
      default_settings: {
        collection: {
          single_file_data_path: '_data.json',
          single_file_pretty: true,
        }
      }
    };
  }
}

export async function load_test_env(t) {
  const main = new TestMain();
  const env = await SmartEnv.create(main, main.smart_env_config);

  // Ensure adapter is initialized before loading items
  await env.collection.data_adapter.load_json_data();

  // Load existing items
  const keys = Object.keys(env.collection.data_adapter.json_data || {})
    .map(key => key.split(':')[1]);

  keys.forEach(key => {
    env.collection.items[key] = new CollectionItem(env, { path: key });
    env.collection.items[key]._queue_load = true;
  });

  await env.collection.process_load_queue();
  t.context.env = env;
}