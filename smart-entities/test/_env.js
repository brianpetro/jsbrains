import { TestSmartCollectionAdapter } from '../../smart-collections/adapters/_test.js';
import { TestSmartFsAdapter } from '../../smart-fs/adapters/_test.js';
import { SmartEntity } from '../smart_entity.js';
import { SmartEntities } from '../smart_entities.js';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartChunks } from '../../smart-chunks/smart_chunks.js';
import { SmartEmbedModel } from '../../smart-embed-model/smart_embed_model.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';

const __dirname = new URL('.', import.meta.url).pathname;

// stub SmartEntities.load_smart_embed_model
SmartEntities.prototype.load_smart_embed = async function() {
  this.smart_embed = {
    embed: () => {
      return {
        vec: [0.1, 0.2, 0.3],
        tokens: 100
      }
    },
    embed_batch: (items) => {
      return items.map(item => ({
        ...item,
        vec: [0.1, 0.2, 0.3],
        tokens: 100
      }));
    }
  };
  return Promise.resolve();
};

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
        smart_entities: SmartEntities,
      },
      item_types: {
        SmartEntity,
      },
      smart_env_settings: {
        smart_entities: {
          embed_model: 'model1',
        },
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