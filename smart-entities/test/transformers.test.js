import test from 'ava';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Import or reference your environment, sources, blocks, etc.:
import { SmartEnv } from 'smart-environment';
import { SmartFs } from 'smart-fs';
import { NodeFsSmartFsAdapter } from 'smart-fs/adapters/node_fs.js';
import { SmartSettings } from 'smart-settings';

// We'll use SmartSources + SmartEntities to show an embedding test
import { SmartSources, SmartSource } from 'smart-sources';
import source_data_adapter from 'smart-sources/adapters/data/ajson_multi_file.js';
import { MarkdownSourceContentAdapter } from 'smart-sources/adapters/markdown_source.js';
import { SmartBlocks, SmartBlock } from 'smart-blocks';
import block_data_adapter from 'smart-blocks/adapters/data/ajson_multi_file.js';
import { MarkdownBlockContentAdapter } from 'smart-blocks/adapters/markdown_block.js';

// For embedding we use a Transformers adapter as an example:
import { SmartEmbedModel } from 'smart-embed-model';
import { SmartEmbedTransformersAdapter } from 'smart-embed-model/adapters/transformers.js';

test.before(async (t) => {
  // 1) Ensure our test_content has been created
  const contentDir = path.join(process.cwd(), 'test/test-content');
  if (!fs.existsSync(contentDir)) {
    // If not present, run the script
    const scriptPath = path.join(process.cwd(), 'test/test_content.js');
    if (fs.existsSync(scriptPath)) {
      execSync(`node ${scriptPath}`);
    } else {
      throw new Error(`Missing test_content.js script at ${scriptPath}`);
    }
  }

  // 2) Create an environment
  t.context.env = await SmartEnv.create(
    {
      load_settings: () => ({}),
      save_settings: () => {},
      get settings() { return {}; },
    },
    {
      env_path: contentDir,
      modules: {
        smart_fs: { class: SmartFs, adapter: NodeFsSmartFsAdapter },
        smart_embed_model: {
          class: SmartEmbedModel,
          adapters: {
            transformers: SmartEmbedTransformersAdapter,
          },
        },
      },
      collections: {
        // We'll attach a SmartSources collection
        smart_sources: {
          class: SmartSources,
          data_adapter: source_data_adapter,
          source_adapters: {
            md: MarkdownSourceContentAdapter,
          }
        },
        smart_blocks: {
          class: SmartBlocks,
          data_adapter: block_data_adapter,
          block_adapters: {
            md: MarkdownBlockContentAdapter,
          }
        },
      },
      item_types: {
        SmartSource,
        SmartBlock
      },
      default_settings: {
        smart_sources: {
          data_dir: 'multi',
          embed_model: {
            adapter: 'transformers',
            transformers: {
              model_key: 'TaylorAI/bge-micro-v2',  // or any local/huggingface model 
              legacy_transformers: false,
            },
          },
          // For demonstration, embed anything with >=10 chars
          min_chars: 10,
        }
      }
    }
  );

  // 3) Initialize the sources
  await t.context.env.smart_sources.init_items();
  await t.context.env.smart_sources.process_load_queue();

  // 4) Import from actual markdown => parse => queue embed
  await t.context.env.smart_sources.process_source_import_queue();
  // 5) Save any newly created items
  await t.context.env.smart_sources.process_save_queue();
});

test.after(async (t) => {
  // optional: clean up the test-content folder
  fs.rmSync(path.join(process.cwd(), 'test/test-content'), { recursive: true, force: true });
});

test.serial("Check that sources have embeddings via Transformers", async (t) => {
  const { env } = t.context;
  const sources = env.smart_sources;

  // Process the embed queue for sources
  await sources.process_embed_queue();

  // All items with >10 chars in content should have a .vec
  const embedded = Object.values(sources.items).filter(src => src.vec);
  t.true(embedded.length > 0, 'At least one source has a vector');

  // Print out the embedding sizes
  embedded.forEach((src) => {
    t.truthy(src.vec, `Source ${src.key} has a vector`);
    console.log(`Source ${src.key} vector length: ${src.vec?.length}`);
  });
});
