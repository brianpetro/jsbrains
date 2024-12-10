import test from 'ava';
import { JsonSingleFileCollectionDataAdapter } from '../../smart-collections/adapters/json_single_file.js';
import { SmartFsTestAdapter } from '../../smart-fs/adapters/_test.js';
import { SourceTestAdapter } from './_test.js';
import { MarkdownSourceAdapter } from '../adapters/markdown.js';
import { SmartSource } from '../smart_source.js';
import { SmartSources } from '../smart_sources.js';
import { SmartBlock } from '../smart_block.js';
import { SmartBlocks } from '../smart_blocks.js';
// import { SmartDirectory } from '../smart_directory.js';
// import { SmartDirectories } from '../smart_directories.js';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartEmbedModel } from '../../smart-embed-model/smart_embed_model.js';
import { SmartEmbedTransformersAdapter } from '../../smart-embed-model/adapters/transformers.js';
import { SmartEmbedOpenAIAdapter } from '../../smart-embed-model/adapters/openai.js';
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
        // smart_embed_model: {
        //   class: SmartEmbedModel,
        //   adapters: {
        //     transformers: SmartEmbedTransformersAdapter,
        //     openai: SmartEmbedOpenAIAdapter,
        //   },
        // },
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
            md: MarkdownSourceAdapter,
            default: MarkdownSourceAdapter
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

test.beforeEach(async t => {
  await load_test_env(t);
});

test.serial('MarkdownSourceAdapter import method', async t => {
  const env = t.context.env;
  const fs = t.context.fs;
  
  // Create a markdown file
  const content = `# Heading 1
Some content under heading 1.

## Heading 2
Some content under heading 2.

[Link to other file](other.md)
`;

  await fs.write('test.md', content);
  await fs.load_files();

  // Create or update the SmartSource
  const source = await env.smart_sources.create_or_update({ path: 'test.md' });

  // Import the content
  await source.import();

  // Check that the blocks are correctly parsed
  t.truthy(source.data.blocks);

  // Check that outlinks are correctly set
  t.truthy(source.data.outlinks);
  t.is(source.data.outlinks.length, 1);
  t.is(source.data.outlinks[0].target, 'other.md');

  // Check that blocks are created in smart_blocks collection
  const block1 = env.smart_blocks.get('test.md#Heading 1');
  t.truthy(block1);
  const block2 = env.smart_blocks.get('test.md#Heading 1#Heading 2');
  t.truthy(block2);
});

test.serial('MarkdownSourceAdapter append method', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  // Initial content
  const initial_content = '# Initial Heading\nInitial content.';
  await fs.write('append_test.md', initial_content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'append_test.md' });

  // Append content
  const append_content = '# Appended Heading\nAppended content.';
  await source.append(append_content);

  // Read the content
  const content = await source.read();

  // Check that content is appended
  const expected_content = initial_content + '\n\n' + append_content;
  t.is(content, expected_content, 'Content should be appended correctly.');
});

test.serial('MarkdownSourceAdapter update method - replace_all mode', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const initial_content = '# Heading\nInitial content.';
  await fs.write('update_test.md', initial_content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'update_test.md' });

  const new_content = '# New Heading\nNew content.';
  await source.update(new_content, { mode: 'replace_all' });

  const content = await source.read();
  t.is(content, new_content, 'Content should be replaced entirely.');
});

test.serial('MarkdownSourceAdapter update method - merge_replace mode', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const initial_content = '# Heading\nInitial content.\n## Subheading\nSubcontent.';
  await fs.write('update_test.md', initial_content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'update_test.md' });

  const new_content = '# Heading\nUpdated content.\n## Subheading\nUpdated subcontent.';
  await source.update(new_content, { mode: 'merge_replace' });

  const content = await source.read();

  // Since 'merge_replace' should replace matching blocks
  const expected_content = new_content;
  t.is(content, expected_content, 'Content should have matching blocks replaced.');
});

test.serial('MarkdownSourceAdapter merge method - append_blocks mode', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const initial_content = '# Heading\nInitial content.';
  await fs.write('update_test.md', initial_content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'update_test.md' });
  await source.import();

  const new_content = '# Heading\nAppended content.\n## New Subheading\nNew subcontent.';
  await source.merge(new_content, { mode: 'append_blocks' });

  const content = await source.read();

  const expected_content = '# Heading\nInitial content.\n\nAppended content.\n## New Subheading\nNew subcontent.';
  t.is(content, expected_content, 'Content should have new blocks appended.');
});

test.serial('MarkdownSourceAdapter read method with no_changes option', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content_with_changes = `<<<<<<< HEAD
# Original Heading
=======
# New Heading
>>>>>>>
Some content`;

  await fs.write('changes_test.md', content_with_changes);
  await fs.load_files();
  const source = await env.smart_sources.create_or_update({ path: 'changes_test.md' });

  const content_before = await source.read({ no_changes: 'before' });
  t.is(content_before, '# Original Heading\nSome content', 'Should return content before changes');

  const content_after = await source.read({ no_changes: 'after' });
  t.is(content_after, '# New Heading\nSome content', 'Should return content after changes');

  const content_with_changes_result = await source.read({ no_changes: false });
  t.is(content_with_changes_result, content_with_changes, 'Should return content with change syntax');
});

test.serial('MarkdownSourceAdapter read method with add_depth option', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content = `# Heading 1
## Heading 2
Some content`;

  await fs.write('depth_test.md', content);
  await fs.load_files();
  const source = await env.smart_sources.create_or_update({ path: 'depth_test.md' });

  const content_depth_1 = await source.read({ add_depth: 1 });
  const expected_depth_1 = `## Heading 1
### Heading 2
Some content`;
  t.is(content_depth_1, expected_depth_1, 'Should increase heading depth by 1');
});

test.serial('MarkdownSourceAdapter remove method', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content = 'Some content to remove.';
  await fs.write('remove_test.md', content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'remove_test.md' });

  await source.remove();
  await env.smart_sources.process_save_queue();

  const exists = await fs.exists('remove_test.md');
  t.false(exists, 'File should be removed');

  // Ensure that source is deleted from smart_sources collection
  const source_in_collection = env.smart_sources.get('remove_test.md');
  t.falsy(source_in_collection, 'Source should be removed from collection');
});

test.serial('MarkdownSourceAdapter move_to method - move to new path', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content = 'Content to move.';
  await fs.write('move_from.md', content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'move_from.md' });

  await source.move_to('move_to.md');

  const exists_old = await fs.exists('move_from.md');
  t.false(exists_old, 'Old file should not exist');

  const exists_new = await fs.exists('move_to.md');
  t.true(exists_new, 'New file should exist');

  const new_content = await fs.read('move_to.md');
  t.is(new_content, content, 'Content should be moved correctly');

  // Ensure that source is updated in smart_sources collection
  const source_new = env.smart_sources.get('move_to.md');
  t.truthy(source_new, 'Source should be updated in collection');
});

test.serial('MarkdownSourceAdapter move_to method - move to existing source (merge)', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content_from = 'Content from source.';
  const content_to = 'Content in destination source.';

  await fs.write('move_from.md', content_from);
  await fs.write('move_to.md', content_to);
  await fs.load_files();

  const source_from = await env.smart_sources.create_or_update({ path: 'move_from.md' });
  const source_to = await env.smart_sources.create_or_update({ path: 'move_to.md' });

  await source_from.move_to('move_to.md');
  // process save queue to ensure changes are saved (deleted items removed from collection)
  await env.smart_sources.process_save_queue();

  const exists_old = await fs.exists('move_from.md');
  t.false(exists_old, 'Old file should not exist');

  const new_content = await fs.read('move_to.md');
  const expected_content = content_to + '\n\n' + content_from;
  t.is(new_content, expected_content, 'Content should be merged in destination');

  // Ensure that source_from is removed from smart_sources collection
  const source_from_in_collection = env.smart_sources.get('move_from.md');
  t.falsy(source_from_in_collection, 'Source from should be removed from collection');
});

test.serial('MarkdownSourceAdapter block_read method', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content = `# Heading 1
Content under heading 1.
## Heading 2
Content under heading 2.`;

  await fs.write('block_read_test.md', content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'block_read_test.md' });
  await source.import();

  const block = env.smart_blocks.get('block_read_test.md#Heading 1');

  const block_content = await block.read();

  
  t.is(block_content, content, 'Block content should be read correctly.');
  const block2 = env.smart_blocks.get('block_read_test.md#Heading 1#Heading 2');
  const expected_block_content = `## Heading 2
Content under heading 2.`;
  t.is(await block2.read(), expected_block_content, 'Block content should be read correctly.');
});

test.serial('MarkdownSourceAdapter block_append method', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content = `# Heading 1
Content under heading 1.`;

  await fs.write('block_append_test.md', content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'block_append_test.md' });
  await source.import();

  const block = env.smart_blocks.get('block_append_test.md#Heading 1');

  const append_content = 'Additional content for heading 1.';
  await block.append(append_content);

  const block_content = await block.read();

  const expected_block_content = `# Heading 1
Content under heading 1.

Additional content for heading 1.`;

  t.is(block_content, expected_block_content, 'Content should be appended to the block.');
});

test.serial('MarkdownSourceAdapter block_update method', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content = `# Heading 1
Content under heading 1.`;

  await fs.write('block_update_test.md', content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'block_update_test.md' });
  await source.import();

  const block = env.smart_blocks.get('block_update_test.md#Heading 1');

  const new_block_content = `# Heading 1
Updated content under heading 1.`;

  await block.update(new_block_content);

  const block_content = await block.read();

  t.is(block_content, new_block_content, 'Block content should be updated.');
});

test.serial('MarkdownSourceAdapter block_remove method', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content = `# Heading 1
Content under heading 1.
# Heading 2
Content under heading 2.`;

  await fs.write('block_remove_test.md', content);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'block_remove_test.md' });
  await source.import();

  const block = env.smart_blocks.get('block_remove_test.md#Heading 1');

  await block.remove();
  await env.smart_sources.process_save_queue();

  const source_content = await source.read();

  const expected_content = `# Heading 2
Content under heading 2.`;

  t.is(source_content, expected_content, 'Block should be removed from source.');

  const block_in_collection = env.smart_blocks.get('block_remove_test.md#Heading 1');
  t.falsy(block_in_collection, 'Block should be removed from collection.');
});

test.serial('MarkdownSourceAdapter block_move_to method', async t => {
  const env = t.context.env;
  const fs = t.context.fs;

  const content_source = `# Heading 1
Content under heading 1.
## Subheading
Subcontent.`;

  await fs.write('block_move_from.md', content_source);

  const content_target = `# Existing Heading
Existing content.`;

  await fs.write('block_move_to.md', content_target);
  await fs.load_files();

  const source = await env.smart_sources.create_or_update({ path: 'block_move_from.md' });
  await source.import();

  const target = await env.smart_sources.create_or_update({ path: 'block_move_to.md' });

  const block = env.smart_blocks.get('block_move_from.md#Heading 1#Subheading');

  await block.move_to('block_move_to.md');
  await env.smart_sources.process_save_queue();
  // Check that the block is removed from source
  const source_content = await source.read();
  const expected_source_content = `# Heading 1
Content under heading 1.`;
  t.is(source_content, expected_source_content, 'Block should be removed from source.');

  // Check that the block content is appended to target
  const target_content = await target.read();
  const expected_target_content = content_target + '\n\n## Subheading\nSubcontent.';
  t.is(target_content, expected_target_content, 'Block content should be appended to target.');
  // Ensure block is removed from collection
  const block_in_collection = env.smart_blocks.get('block_move_from.md#Heading 1#Subheading');
  t.falsy(block_in_collection, 'Block should be removed from collection.');
});