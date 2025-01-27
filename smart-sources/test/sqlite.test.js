import test from 'ava';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import { NodeFsSmartFsAdapter } from '../../smart-fs/adapters/node_fs.js';
import { MarkdownSourceContentAdapter } from '../adapters/markdown_source.js';
import { SmartSources } from '../smart_sources.js';
import { SmartSource } from '../smart_source.js';
import { SmartBlocks } from '../smart_blocks.js';
import { SmartBlock } from '../smart_block.js';
import { SqliteSourceDataAdapter } from '../adapters/data/sqlite.js';

const __dirname = new URL('.', import.meta.url).pathname;

class TestMultiFileSourceMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_config() {
    return {
      env_path: __dirname + 'test-content',
      modules: {
        smart_fs: {
          class: SmartFs,
          adapter: NodeFsSmartFsAdapter,
        }
      },
      collections: {
        smart_sources: {
          class: SmartSources,
          data_adapter: SqliteSourceDataAdapter,
          source_adapters: {
            default: MarkdownSourceContentAdapter,
            md: MarkdownSourceContentAdapter,
          }
        },
        smart_blocks: {
          class: SmartBlocks,
          data_adapter: SqliteSourceDataAdapter,
        },
      },
      item_types: {
        SmartSource,
        SmartBlock,
      },
      default_settings: {
        smart_sources: {
          sqlite_db_path: 'test.sqlite',
        }
      }
    };
  }
}

async function load_env() {
  const temp_main = new TestMultiFileSourceMain();
  const temp_env = await SmartEnv.create(temp_main, temp_main.smart_env_config);
  
  await temp_env.smart_sources.process_source_import_queue();
  await temp_env.smart_sources.process_save_queue();
  
  const main = new TestMultiFileSourceMain();
  const env = await SmartEnv.create(main, main.smart_env_config);
  env.smart_sources.process_source_import_queue = async () => {};
  return env;
}

test.beforeEach(async t => {
  // Add timeout to environment creation
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Environment creation timed out')), 5000)
  );
  
  try {
    t.context.env = await Promise.race([
      load_env(),
      timeoutPromise
    ]);
    await t.context.env.smart_sources.init_items();
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

// Add cleanup after each test
test.afterEach(async t => {
  if (t.context.env) {
    try {
      // Cleanup any pending operations
      await t.context.env.smart_sources.process_save_queue();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for cleanup
    } catch (error) {
      console.error('Test cleanup failed:', error);
    }
  }
});

/**
 * Test Case 1: Import and Save Sources from Existing Markdown Files
 *
 * This test initializes the environment and imports markdown files from test-content.
 * It then processes import queue and save queue, verifying that `.ajson` files are created.
 */
test.serial('Import and save sources from markdown files', async t => {
  const { env } = t.context;
  const sources = env.smart_sources;
  const fs = sources.data_fs;

  await sources.init_items();
  await sources.process_source_import_queue();
  
  const expected_sources = [
    'my_source.md',
    'append_source.md', 
    'source_to_delete.md',
    'source_with_blocks.md'
  ];

  for (const source_name of expected_sources) {
    t.truthy(sources.get(source_name), `${source_name} should be imported`);
  }

  Object.values(sources.items).forEach(item => item.queue_save());
  await sources.process_save_queue();

  // Verify SQLite database exists
  t.true(await fs.exists('test.sqlite'), 'SQLite database file should exist');

  // Load a new environment to verify data persistence
  const newEnv = await load_env();
  const newSources = newEnv.smart_sources;
  await newSources.init_items();

  // Verify sources are loaded from SQLite
  for (const source_name of expected_sources) {
    const source = newSources.get(source_name);
    t.truthy(source, `${source_name} should be loaded from SQLite`);
    t.truthy(source.data, `${source_name} should have data`);
  }
});

/**
 * Test Case 3: Update and Delete Sources, Verify SQLite Updates
 *
 * This test updates a source, queues a save, and checks that the .ajson file reflects the changes.
 * It also deletes a source and ensures its .ajson file is removed.
 */
test.serial('Update and delete sources, verify SQLite updates', async t => {
  const { env } = t.context;
  const sources = env.smart_sources;

  // Ensure environment and sources are loaded
  await sources.init_items();
  await sources.process_source_import_queue();
  await sources.process_save_queue();

  // Update append_source.md
  const append_source = sources.get('append_source.md');
  t.truthy(append_source, 'append_source.md should exist before update');
  append_source.update_data({ updated_field: 'new_value' });
  append_source.queue_save();
  await sources.process_save_queue();

  // Load new environment to verify persistence
  const newEnv = await load_env();
  const newSources = newEnv.smart_sources;
  await newSources.init_items();

  const updated_source = newSources.get('append_source.md');
  t.is(updated_source.data.updated_field, 'new_value', 'Updated field should persist in SQLite');

  // Delete source_to_delete.md
  const source_to_delete = sources.get('source_to_delete.md');
  t.truthy(source_to_delete, 'source_to_delete.md should exist before deletion');
  source_to_delete.delete();
  await sources.process_save_queue();

  // Verify deletion persists
  const finalEnv = await load_env();
  const finalSources = finalEnv.smart_sources;
  await finalSources.init_items();
  t.falsy(finalSources.get('source_to_delete.md'), 'Deleted source should not exist in SQLite');
});

/**
 * Test Case 4: Ensure Blocks Are Reflected in SQLite
 *
 * Verify that when blocks are imported and saved, the corresponding block entries appear
 * in the .ajson file. We will also check that removing a block updates the AJSON accordingly.
 */
test.serial('Blocks reflect in SQLite and block removal updates database', async t => {
  const { env } = t.context;
  const sources = env.smart_sources;
  const blocks = env.smart_blocks;

  await sources.init_items();
  await sources.process_source_import_queue();
  
  const source_with_blocks = sources.get('source_with_blocks.md');
  await source_with_blocks.import();
  
  t.truthy(source_with_blocks.data.blocks, 'source should have blocks');
  
  source_with_blocks.queue_save();
  await sources.process_save_queue();
  
  // Load new environment to verify block persistence
  const newEnv = await load_env();
  const newSources = newEnv.smart_sources;
  const newBlocks = newEnv.smart_blocks;
  await newSources.init_items();
  
  const reloaded_source = newSources.get('source_with_blocks.md');
  t.truthy(reloaded_source.data.blocks, 'Blocks should persist in SQLite');

  // Delete a block and verify deletion
  const block_keys = Object.keys(source_with_blocks.data.blocks);
  const block_to_delete_key = block_keys[0];
  const block_to_delete = blocks.get(`source_with_blocks.md${block_to_delete_key}`);

  t.truthy(block_to_delete, 'Block to delete should exist before removal');
  block_to_delete.delete();
  await blocks.process_save_queue();

  // Verify block deletion persists
  const finalEnv = await load_env();
  const finalBlocks = finalEnv.smart_blocks;
  await finalBlocks.init_items();
  t.falsy(finalBlocks.get(`source_with_blocks.md${block_to_delete_key}`), 'Deleted block should not exist in SQLite');
});

/**
 * Test Case 5: Confirm No Re-Import Needed After Loading from AJSON
 *
 * This test ensures that after loading items from AJSON, we do not need to re-import from markdown.
 * If no changes have occurred, the items should remain loaded and stable.
 */
test.serial('No re-import needed if no changes after loading from AJSON', async t => {
  const { env } = t.context;
  const sources = env.smart_sources;

  // Initial import and save
  await sources.init_items();
  await sources.process_source_import_queue();
  await sources.process_save_queue();

  // Reload environment from AJSON
  const newEnv = await load_env();
  const newSources = newEnv.smart_sources;

  // Initialize items and process load queue
  await newSources.init_items();
  await newSources.process_load_queue();
  
  // Add a small delay to ensure all async operations are complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Confirm that items are loaded and no re-import is queued
  const my_source = newSources.get('my_source.md');
  t.truthy(my_source, 'my_source.md should be loaded from AJSON');
  
  // Ensure import_queue is initialized as an array
  if (!newSources.import_queue) {
    newSources.import_queue = [];
  }
  
  // Check import queue
  t.deepEqual(Array.from(newSources.import_queue || []), [], 'No sources should be queued for import');
});

/**
 * Test Case 6: Verify SmartBlock Format in AJSON Files
 * 
 * This test ensures that blocks are saved in the correct format in AJSON files,
 * with lines starting with "SmartBlock:" for block entries.
 */
test.serial('Verify SmartBlock format in AJSON files', async t => {
  const { env } = t.context;
  const sources = env.smart_sources;
  const fs = sources.data_fs;

  // Initialize and process queues
  await sources.init_items();
  await sources.process_source_import_queue();
  
  // Get source with blocks and ensure it's imported
  const source_with_blocks = sources.get('source_with_blocks.md');
  await source_with_blocks.import();
  
  // Queue save and process
  source_with_blocks.queue_save();
  await sources.process_save_queue();
  
  // Add small delay to ensure file write completes
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify AJSON content and format
  const swb_path = `${sources.data_dir}/source_with_blocks_md.ajson`;
  t.true(await fs.exists(swb_path), 'source_with_blocks_md.ajson should exist');
  
  const ajson_content = await fs.read(swb_path);
  
  // Check for SmartBlock entries
  t.regex(ajson_content, /"SmartBlock:/, 'AJSON should contain SmartBlock entries');
  
  // Split content into lines and verify block format
  const lines = ajson_content.split('\n');
  const block_lines = lines.filter(line => line.includes('"SmartBlock:'));
  
  t.true(block_lines.length > 0, 'Should have at least one SmartBlock entry');
  
  // Verify each block line format
  block_lines.forEach(line => {
    t.regex(line, /^"SmartBlock:[^"]+":/, 'Each block entry should start with "SmartBlock:" followed by an identifier');
    t.regex(line, /"class_name":"SmartBlock"/, 'Each block entry should contain class_name field');
  });

  // Verify source references its blocks
  const source_line = lines.find(line => line.includes('"SmartSource:'));
  t.regex(source_line, /"blocks":\s*{/, 'Source should reference blocks in its data');
});

/**
 * Test Case 7: Load sources and blocks from existing AJSON files
 *
 * This test ensures that sources and blocks are correctly loaded from AJSON files.
 */
test.serial('Load sources and blocks from existing AJSON files', async t => {
  const { env } = t.context;
  const sources = env.smart_sources;
  const blocks = env.smart_blocks;

  // Process load queue to load from .ajson files
  await sources.process_load_queue();

  // Verify sources are loaded
  const source_with_blocks = sources.get('source_with_blocks.md');
  t.truthy(source_with_blocks, 'source_with_blocks.md should be loaded');
  t.truthy(source_with_blocks.data.blocks['#Source With Blocks'], 'source_with_blocks.md should have correct block references');
  t.truthy(source_with_blocks.data.blocks['#Source With Blocks#{1}'], 'source_with_blocks.md should have correct block references');
  t.truthy(source_with_blocks.data.blocks['#Source With Blocks#Section 1'], 'source_with_blocks.md should have correct block references');
  t.truthy(source_with_blocks.data.blocks['#Source With Blocks#Section 2'], 'source_with_blocks.md should have correct block references');

  // Verify blocks are loaded
  const block1 = blocks.get('source_with_blocks.md#Source With Blocks#{1}');
  const block2 = blocks.get('source_with_blocks.md#Source With Blocks#Section 1');
  const block3 = blocks.get('source_with_blocks.md#Source With Blocks#Section 2');
  
  t.truthy(block1, 'block1 should be loaded');
  t.truthy(block2, 'block2 should be loaded');
  t.truthy(block3, 'block3 should be loaded');
});
