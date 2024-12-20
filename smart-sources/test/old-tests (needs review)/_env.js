import { JsonSingleFileCollectionDataAdapter } from '../../smart-collections/adapters/json_single_file.js';
import { SmartFsTestAdapter } from '../../smart-fs/adapters/_test.js';
import { SourceTestAdapter } from '../adapters/_test.js';
import { MarkdownSourceContentAdapter } from '../adapters/markdown_source.js';
import { SmartSource } from '../smart_source.js';
import { SmartSources } from '../smart_sources.js';
import { SmartBlock } from '../smart_block.js';
import { SmartBlocks } from '../smart_blocks.js';
// import { SmartDirectory } from '../smart_directory.js';
// import { SmartDirectories } from '../smart_directories.js';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartEmbedModel } from '../../smart-embed-model-v1/smart_embed_model.js';
import { SmartEmbedTransformersAdapter } from '../../smart-embed-model-v1/adapters/transformers.js';
import { SmartEmbedOpenAIAdapter } from '../../smart-embed-model-v1/adapters/openai.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import { SmartSettings } from '../../smart-settings/smart_settings.js';
const __dirname = new URL('.', import.meta.url).pathname;

class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_config() {
    return {
      env_path: __dirname,
      env_data_dir: 'test',
      modules: {
        smart_embed_model: {
          class: SmartEmbedModel,
          adapters: {
            transformers: SmartEmbedTransformersAdapter,
            openai: SmartEmbedOpenAIAdapter,
          },
        },
        smart_fs: {
          class: SmartFs,
          adapter: SmartFsTestAdapter,
        },
        smart_settings: {
          class: SmartSettings,
        },
      },
      collections: {
        smart_sources: {
          class: SmartSources,
          data_adapter: JsonSingleFileCollectionDataAdapter,
          source_adapters: {
            test: SourceTestAdapter,
            md: MarkdownSourceContentAdapter,
            default: MarkdownSourceContentAdapter
          },
        },
        smart_blocks: SmartBlocks,
        // smart_directories: SmartDirectories,
      },
      item_types: {
        SmartSource,
        SmartBlock,
        // SmartDirectory,
      },
    };
  }
}

export async function load_test_env(t) {
  const main = new TestMain();
  const env = await SmartEnv.create(main, main.smart_env_config);
  env.smart_sources.settings.smart_change = {};
  env.smart_sources.settings.smart_change.active = false;
  t.context.env = env;
  t.context.fs = env.smart_sources.fs;
}