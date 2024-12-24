/**
 * @file markdown_source.test.js
 * @description Integration-level tests for the SmartSources Markdown adapter and Block parser.
 *
 * These tests assume the note variations created by the bash script are present in `test/test-content/variations/`.
 * We run through a series of integration tests:
 * - Importing each note
 * - Confirming block parsing correctness
 * - Performing CRUD operations (read, update, destroy) on frontmatter, headings, subheadings, lists, code blocks
 * - Checking repeated headings, special characters, large files, and empty files
 * - Ensuring stable AJSON state after round-trip load/save
 * - Verifying that no errors occur for various edge cases
 *
 * Setup:
 *  - Ensure that `test/test-content/variations/` is created by running the provided bash script before these tests.
 *  - The environment should have `SmartEnv`, `SmartSources`, `SmartBlocks`, and other required classes loaded.
 *  - These tests assume `SmartEnv` and its dependencies are globally accessible or imported from prior setup code.
 *
 * Each test scenario comments reference the note created by the bash script. After each note test scenario, we verify:
 * - import success
 * - block count correctness
 * - sample block CRUD operations and confirm results in `.ajson` files
 * - search or embedding tests if applicable
 *
 * Note: This file outlines test cases and expectations. Actual test runner code (like AVA or Jest) may need to be integrated.
 */

import test from 'ava';
import { SmartEnv } from 'smart-environment/smart_env.js'; // Adjust path as needed
import { SmartFs } from 'smart-fs/smart_fs.js';
import { NodeFsSmartFsAdapter } from 'smart-fs/adapters/node_fs.js';
import { SmartSources } from 'smart-sources/smart_sources.js';
import { SmartSource } from 'smart-sources/smart_source.js';
import { SmartBlocks } from 'smart-blocks/smart_blocks.js';
import { SmartBlock } from 'smart-blocks/smart_block.js';
import { MarkdownSourceContentAdapter } from 'smart-sources/adapters/markdown_source.js';
import { MarkdownBlockContentAdapter } from 'smart-blocks/adapters/markdown_block.js';
import ajson_data_adapter from 'smart-sources/adapters/data/ajson_multi_file.js';
import path from 'path';

const VARIATIONS_DIR = 'test/test-content/variations';
import { execSync } from 'child_process';
import fs from 'fs';

async function create_test_env() {
  // run adjacent test_content.js script and wait for it to finish (use execSync)
  execSync('node test/test_content.js');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const env_path = path.join(process.cwd(), 'test/test-content');
  // console.log(env_path);
  const env = await SmartEnv.create({
    // Mock main or configuration object
    load_settings(){ return {}; },
    save_settings(){},
    get settings(){ return {}; }
  }, {
    env_path: env_path,
    modules: {
      smart_fs: { class: SmartFs, adapter: NodeFsSmartFsAdapter },
    },

    collections: {
      smart_sources: {
        class: SmartSources,
        data_adapter: ajson_data_adapter,
        source_adapters: {
          default: MarkdownSourceContentAdapter,
          md: MarkdownSourceContentAdapter,
        }
      },
      smart_blocks: {
        class: SmartBlocks,
        data_adapter: ajson_data_adapter,
        block_adapters: {
          md: MarkdownBlockContentAdapter,
          default: MarkdownBlockContentAdapter,
        }
      },
    },
    item_types: {
      SmartSource,
      SmartBlock,
    },
    default_settings: {
      smart_sources: {
        data_dir: 'multi'
      }
    }
  });

  await env.smart_sources.init_items();
  return env;
}

test.before(async t => {
  t.context.env = await create_test_env();
  // Process initial import and save queues to ensure a stable state
  await t.context.env.smart_sources.process_load_queue();
  await t.context.env.smart_sources.process_source_import_queue();
  await t.context.env.smart_sources.process_save_queue();
});

test.after(async t => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // delete test/test-content/variations directory
  fs.rmdirSync('test/test-content/variations', { recursive: true });
  // delete test/test-content/test-env/multi directory
  fs.rmdirSync('test/test-content/test-env/multi', { recursive: true });
});

test.serial('frontmatter_note.md: import and verify blocks', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/frontmatter_note.md');
  // console.log(Object.keys(env.smart_sources.items));
  t.truthy(source, 'frontmatter_note.md should be imported');

  // Verify frontmatter block
  const frontmatter_block = env.smart_blocks.get('variations/frontmatter_note.md#---frontmatter---');
  t.truthy(frontmatter_block, 'Frontmatter block should exist');

  // Update frontmatter block
  const new_frontmatter = `---
title: "Updated Title"
date: 2024-01-02
tags: [test, updated]
---`;
  await frontmatter_block.update(new_frontmatter);
  await env.smart_sources.process_save_queue();

  // Re-import and confirm changes
  await source.import();
  t.true(source.data.last_read?.hash !== null, 'Source re-imported successfully');

  // Destroy frontmatter block
  await frontmatter_block.remove();
  await env.smart_sources.process_save_queue();

  // Confirm frontmatter removed
  await source.import();
  t.falsy(env.smart_blocks.get('variations/frontmatter_note.md#---frontmatter---'), 'Frontmatter block should be removed after destroy');
});

test.serial('nested_headings.md: verify deep heading structure', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/nested_headings.md');
  t.truthy(source, 'nested_headings.md should be imported');

  // Check up to level 6 headings
  const level6_block = env.smart_blocks.get('variations/nested_headings.md#Level 1#Level 2#Level 3#Level 4#Level 5#Level 6');
  t.truthy(level6_block, 'Level 6 heading block should exist');

  // Append content to level 3 block and verify
  const level3_block = env.smart_blocks.get('variations/nested_headings.md#Level 1#Level 2#Level 3');
  await level3_block.append("Appended content line");
  await env.smart_sources.process_save_queue();
  
  await source.import();
  const updated_content = await level3_block.read();
  t.regex(updated_content, /Appended content line/, 'Appended line should appear in level 3 block content');
});

test.serial('code_blocks.md: ensure code fences handled correctly', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/code_blocks.md');
  t.truthy(source, 'code_blocks.md should be imported');

  // Confirm code blocks do not break parsing
  const main_heading = env.smart_blocks.get('variations/code_blocks.md#Code Blocks Test');
  t.truthy(main_heading, 'Main heading block should be present');

  // Update code block content via block update
  // The code blocks are part of the main heading block content in this scenario
  const content_before = await main_heading.read();
  const replaced_content = content_before.replace('console.log("Hello, world!");', 'console.log("Hello, integration test!");');
  await main_heading.update(replaced_content);
  await env.smart_sources.process_save_queue();
  
  await source.import();
  const content_after = await main_heading.read();
  t.regex(content_after, /Hello, integration test!/, 'Code block updated correctly');
});

test.serial('no_headings.md: single root block scenario', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/no_headings.md');
  t.truthy(source, 'no_headings.md should be imported');

  const root_block = env.smart_blocks.get('variations/no_headings.md#');
  t.truthy(root_block, 'Root block should exist when no headings present');

  // Update entire file content
  await root_block.update("Updated entire file content with no headings.");
  await env.smart_sources.process_save_queue();

  await source.import();
  const updated = await root_block.read();
  t.is(updated.trim(), "Updated entire file content with no headings.", 'Entire content updated successfully');
});

test.serial('only_lists.md: lists as blocks', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/only_lists.md');
  t.truthy(source, 'only_lists.md should be imported');

  // Confirm top-level list items become sub-blocks
  const first_item_block = env.smart_blocks.get('variations/only_lists.md#{1}');
  t.truthy(first_item_block, 'First list item block should exist');

  // Remove a nested list block if any (not fully implemented, but we can remove lines)
  const before_remove = await first_item_block.read();
  const updated_content = before_remove.replace('Nested item', '');
  await first_item_block.update(updated_content);
  await env.smart_sources.process_save_queue();

  await source.import();
  const after_remove = await first_item_block.read();
  t.false(after_remove.includes('Nested item'), 'Nested list line removed successfully');
});

test.serial('repeated_headings.md: verify block keys for repeated headings', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/repeated_headings.md');
  t.truthy(source, 'repeated_headings.md should be imported');

  // Check repeated top-level headings
  const first_repeated = env.smart_blocks.get('variations/repeated_headings.md#Repeated');
  const second_repeated = env.smart_blocks.get('variations/repeated_headings.md#Repeated[2]');
  t.truthy(first_repeated, 'First occurrence of repeated heading exists');
  t.truthy(second_repeated, 'Second occurrence of repeated heading exists');

  // Remove the second repeated heading block
  await second_repeated.remove();
  await env.smart_sources.process_save_queue();
  
  await source.import();
  t.falsy(env.smart_blocks.get('variations/repeated_headings.md#Repeated[2]'), 'Second repeated heading block removed successfully');
});

test.serial('mixed_content.md: complex scenario with frontmatter, lists, code', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/mixed_content.md');
  t.truthy(source, 'mixed_content.md should be imported');

  const frontmatter_block = env.smart_blocks.get('variations/mixed_content.md#---frontmatter---');
  t.truthy(frontmatter_block, 'Frontmatter block present in mixed_content.md');

  const main_heading = env.smart_blocks.get('variations/mixed_content.md#Main Heading');
  const subheading = env.smart_blocks.get('variations/mixed_content.md#Main Heading#Subheading');
  const code_inside = await main_heading.read();
  t.regex(code_inside, /```python/, 'Code block found inside main heading content');

  // Update subheading content
  await subheading.update("Replaced subheading content entirely.");
  await env.smart_sources.process_save_queue();

  await source.import();
  const subheading_updated = await subheading.read();
  t.is(subheading_updated.trim(), "Replaced subheading content entirely.", 'Subheading content updated');
});

test.serial('large_note.md: performance and stability checks', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/large_note.md');
  t.truthy(source, 'large_note.md should be imported');

  // Ensure we have large blocks
  const main_block = env.smart_blocks.get('variations/large_note.md#Large Note');
  const another_heading_block = env.smart_blocks.get('variations/large_note.md#Large Note#Another Heading');
  t.truthy(main_block, 'Main block in large note exists');
  t.truthy(another_heading_block, 'Another heading block in large note exists');

  // Just read and ensure no timeout or error occurs
  const content_main = await main_block.read();
  t.true(content_main.length > 1000, 'Main block content is large as expected');

  // Update a large portion of text
  await another_heading_block.update("Shortened content for the second heading block.");
  await env.smart_sources.process_save_queue();

  await source.import();
  const updated_content = await another_heading_block.read();
  t.is(updated_content.trim(), "Shortened content for the second heading block.", 'Large note block updated successfully');
});

test.serial('empty_note.md: no content scenario', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/empty_note.md');
  t.truthy(source, 'empty_note.md imported even if empty');

  // Check if a root block is created
  const root_block = env.smart_blocks.get('variations/empty_note.md#');
  t.truthy(root_block, 'Root block should exist even if empty file');
  
  const content = await root_block.read();
  t.is(content.trim(), '', 'Empty file block content is empty as expected');
});

test.serial('special_chars_headings.md: special chars in headings', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/special_chars_headings.md');
  t.truthy(source, 'special_chars_headings.md should be imported');

  const special_heading = env.smart_blocks.get('variations/special_chars_headings.md#Heading with $Special_Char');
  t.truthy(special_heading, 'Block with special chars in heading found');

  await special_heading.append("Appended content with $ and _ characters.");
  await env.smart_sources.process_save_queue();

  await source.import();
  const updated = await special_heading.read();
  t.regex(updated, /\$ and _ characters/, 'Special chars preserved after update');
});

test.serial('frontmatter_complex.md: nested frontmatter structures', async t => {
  const { env } = t.context;
  const source = env.smart_sources.get('variations/frontmatter_complex.md');
  t.truthy(source, 'frontmatter_complex.md should be imported');

  const fm_block = env.smart_blocks.get('variations/frontmatter_complex.md#---frontmatter---');
  t.truthy(fm_block, 'Nested frontmatter block found');

  // Update frontmatter
  const new_fm = `---
title: Complex Frontmatter Updated
authors:
  - name: Charlie
    role: Maintainer
metadata:
  tags: [complex, updated]
  version: 3
---`;
  await fm_block.update(new_fm);
  await env.smart_sources.process_save_queue();
  
  await source.import();
  const fm_content = await fm_block.read();
  t.regex(fm_content, /Charlie/, 'Frontmatter updated with nested data successfully');
});

