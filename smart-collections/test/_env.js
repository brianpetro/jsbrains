import { CollectionItem } from '../main.js';
import { Collection } from '../main.js';
import { TestSmartCollectionAdapter } from '../adapters/_test.js';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartChunks } from '../../smart-chunks/smart_chunks.js';
import { SmartEmbedModel } from '../../smart-embed-model/smart_embed_model.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import { TestSmartFsAdapter } from '../../smart-fs/adapters/_test.js';

const __dirname = new URL('.', import.meta.url).pathname;

class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_opts() {
    return {
      env_path: __dirname,
      env_data_dir: 'test',
      smart_chunks_class: SmartChunks,
      smart_collection_adapter_class: TestSmartCollectionAdapter,
      smart_embed_model_class: SmartEmbedModel,
      smart_fs_class: SmartFs,
      smart_fs_adapter_class: TestSmartFsAdapter,
      collections: {
        collection: Collection,
      },
      item_types: {
        CollectionItem,
      },
    };
  }
}

export async function load_test_env(t) {
  const main = new TestMain();
  const env = new SmartEnv(main, main.smart_env_opts);
  await env.init();
  t.context.env = env;
}