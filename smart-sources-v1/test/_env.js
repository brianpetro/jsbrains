import { SmartCollectionTestDataAdapter } from '../../smart-collections/adapters/_test.js';
import { SmartFsTestAdapter } from '../../smart-fs/adapters/_test.js';
import { SourceTestAdapter } from '../adapters/_test.js';
import { MarkdownSourceAdapter } from '../adapters/markdown.js';
import { SmartSource } from '../smart_source.js';
import { SmartSources } from '../smart_sources.js';
import { SmartBlock } from '../smart_block.js';
import { SmartBlocks } from '../smart_blocks.js';
import { SmartDirectory } from '../smart_directory.js';
import { SmartDirectories } from '../smart_directories.js';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartChunks } from '../../smart-chunks/smart_chunks.js';
import { SmartEmbedModel } from '../../smart-embed-model/smart_embed_model.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
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
        smart_chunks: SmartChunks,
        smart_embed_model: SmartEmbedModel,
        smart_fs: {
          class: SmartFs,
          adapter: SmartFsTestAdapter,
        }
      },
      collections: {
        smart_sources: {
          class: SmartSources,
          data_adapter: SmartCollectionTestDataAdapter,
        },
        smart_blocks: SmartBlocks,
        smart_directories: SmartDirectories,
      },
      item_types: {
        SmartSource,
        SmartBlock,
        SmartDirectory,
      },
      source_adapters: {
        test: SourceTestAdapter,
      },
    };
  }
}

export async function load_test_env(t) {
  const main = new TestMain();
  const env = new SmartEnv(main, main.smart_env_config);
  await env.init();
  t.context.env = env;
  t.context.fs = env.smart_sources.fs;
}