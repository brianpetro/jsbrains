/**
 * @file snapshot.test.js
 * @description
 * Integration tests for 'snapshot.js' in 'smart-contexts/utils/'. These tests verify that
 * building snapshots handles codeblock expansions, link-depth expansions, partial truncation,
 * folder expansions, re-discovery of the same file, and other scenarios.
 */

import test from 'ava';
import { build_snapshot } from './snapshot.js';
import { SmartContext } from '../smart_context.js';
import { SmartEnv } from 'smart-environment';
import { SmartSources, SmartSource } from 'smart-sources';
import { MarkdownSourceContentAdapter } from 'smart-sources/adapters/markdown_source.js';
import { DataContentAdapter } from 'smart-sources/adapters/data_content.js';
import { SmartBlocks, SmartBlock } from 'smart-blocks';
import { MarkdownBlockContentAdapter } from 'smart-blocks/adapters/markdown_block.js';
import { SmartContexts } from '../smart_contexts.js';
import ajson_data_adapter from 'smart-sources/adapters/data/ajson_multi_file.js';
import { SmartFsTestAdapter } from 'smart-file-system/adapters/_test.js';
import { NodeFsSmartFsAdapter } from 'smart-file-system/adapters/node_fs.js';
import { SmartFs } from 'smart-file-system/smart_fs.js';

/**
 * A simple test Main class that yields a well-defined smart_env_config.
 */
class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_config() {
    return {
      env_path: '/Users/brian/Documents/jsbrains/smart-contexts/test/test-content',
      modules: {
        smart_fs: {
          class: SmartFs,
          adapter: SmartFsTestAdapter
        }
      },
      collections: {
        smart_sources: {
          class: SmartSources,
          data_adapter: ajson_data_adapter,
          source_adapters: {
            default: MarkdownSourceContentAdapter,
            md: MarkdownSourceContentAdapter,
            data: DataContentAdapter
          }
        },
        smart_blocks: {
          class: SmartBlocks,
          data_adapter: ajson_data_adapter,
          block_adapters: {
            default: MarkdownBlockContentAdapter,
            md: MarkdownBlockContentAdapter,
            data: MarkdownBlockContentAdapter
          }
        },
        smart_contexts: {
          class: SmartContexts,
          data_adapter: ajson_data_adapter
        }
      },
      item_types: {
        SmartSource,
        SmartContext,
        SmartBlock
      }
    };
  }
}

let env = null;

/**
 * Prepare the live smart_env before all tests.
 * We'll store test files in memory using SmartFsTestAdapter.
 */
test.before(async () => {
  const main = new TestMain();
  env = await SmartEnv.create(main, main.smart_env_config);
});

/**
 * 1) Items with codeblock lines add those paths at the same depth
 */
test.serial('Items with codeblock lines add those paths at the same depth', async t => {
  // Write files to the in-memory test FS
  const file_primaryA = `
    # Title A
    Some content
    \`\`\`smart-context
    codeRef1.md
    codeRef2.md
    \`\`\`
    # End
  `;
  await env.smart_fs.adapter.write('primaryA.md', file_primaryA);
  await env.smart_fs.adapter.write('codeRef1.md', '# CodeRef1\nHello from codeRef1');
  await env.smart_fs.adapter.write('codeRef2.md', '# CodeRef2\nHello from codeRef2');
  await env.smart_fs.adapter.write('other.md', '# Unrelated\nNo code blocks');

  // Create the SmartContext item in the 'smart_contexts' collection
  // referencing 'primaryA.md' and 'other.md' at depth=0
  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testCodeblockDepth',
    context_items: {
      'primaryA.md': true,
      'other.md': true
    }
  });

  // Build snapshot with link_depth=0 => only depth=0 expansions
  const snapshot = await build_snapshot(sc_item, { link_depth: 0, max_len: 0 });

  // Check depth=0 includes: primaryA.md, other.md, codeRef1.md, codeRef2.md
  t.truthy(snapshot.items[0], 'Should have depth=0 object');
  const depth0 = snapshot.items[0];
  t.truthy(depth0['primaryA.md'], 'primaryA included');
  t.truthy(depth0['other.md'], 'other.md included');
  t.truthy(depth0['codeRef1.md'], 'codeRef1.md included at same depth');
  t.truthy(depth0['codeRef2.md'], 'codeRef2.md included at same depth');

  // Verify content
  t.true(depth0['codeRef1.md'].includes('Hello from codeRef1'), 'codeRef1 content present');
  t.true(depth0['codeRef2.md'].includes('Hello from codeRef2'), 'codeRef2 content present');
});

/**
 * 2) No codeblock lines => normal behavior
 */
test.serial('No codeblock lines => normal behavior', async t => {
  // Write new files
  await env.smart_sources.fs.write('stuff.md', '# Stuff\nNo code blocks here');
  await env.smart_sources.fs.mkdir('folder');
  await env.smart_sources.fs.write('folder/fileA.md', '# Some file\nNo code blocks either');
  await env.smart_sources.fs.load_files();
  await env.smart_sources.init_file_path('stuff.md');
  await env.smart_sources.init_file_path('folder/fileA.md');
  Object.values(env.smart_sources.items).forEach(item => item.queue_import());
  await env.smart_sources.process_source_import_queue();

  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testNoCodeblock',
    context_items: {
      'stuff.md': true,
      'folder': true
    }
  });

  // link_depth=0 => only depth=0 expansions
  const snapshot = await build_snapshot(sc_item, { link_depth: 0 });

  t.deepEqual(Object.keys(snapshot.items).sort(), ['0'], 'Depth=0 only');
  const depth0_keys = Object.keys(snapshot.items[0]).sort();
  t.deepEqual(depth0_keys, ['folder/fileA.md', 'stuff.md'].sort());
});

/**
 * 3) Skipped items remain out if max_len is reached, codeRef items do not appear if skipping begins
 *    Based on the user's updated scenario: skipMe is smaller and is included first, bigOne is skipped.
 */
test.serial('Skipped items remain out if max_len is reached, codeRef items do not appear if skipping begins', async t => {
  // Clean up
  await env.smart_sources.fs.adapter.remove('bigOne.md').catch(() => {});
  await env.smart_sources.fs.adapter.remove('skipMe.md').catch(() => {});

  // We'll create a file that is large (100 chars),
  // and within it a codeblock referencing skipMe.md
  const big_content = 'X'.repeat(100) + '\n```smart-context\nskipMe.md\n```';
  await env.smart_sources.fs.write('bigOne.md', big_content);
  await env.smart_sources.fs.write('skipMe.md', 'some small content');
  await env.smart_sources.fs.load_files();
  await env.smart_sources.init_file_path('bigOne.md');
  await env.smart_sources.init_file_path('skipMe.md');
  Object.values(env.smart_sources.items).forEach(item => item.queue_import());
  await env.smart_sources.process_source_import_queue();

  // If max_len=50 => we expect skipMe is included (because it's smaller and expansions are sorted by length),
  // bigOne is too large => skip
  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testSkipping',
    context_items: {
      'bigOne.md': true
    }
  });

  const snapshot = await build_snapshot(sc_item, { link_depth: 0, max_len: 50 });

  // final result: skipMe is included, bigOne is not
  t.truthy(snapshot.items[0]['skipMe.md'], 'skipMe is included (smaller file), partially or fully');
  t.falsy(snapshot.items[0]['bigOne.md'], 'bigOne is not included');
  t.true(snapshot.skipped_items.includes('bigOne.md'), 'bigOne is in skipped_items');
});

/**
 * 4) Integration test with actual SmartEnv items 
 *    (example usage of real items referencing data content).
 */
test.serial('integration: build_snapshot with actual SmartEnv items', async t => {
  const contexts = env.smart_contexts;

  // Minimal test items in memory
  const srcs = env.smart_sources;
  const sourceA = await srcs.create_or_update({
    key: 'test_integrationA.data',
    content: '# Heading A\nContent A line\n# Secret\nShould hide\n'
  });
  sourceA.queue_save();
  const sourceB = await srcs.create_or_update({
    key: 'test_integrationB.data',
    content: '# Heading B\nContent B line\n'
  });
  sourceB.queue_save();
  await srcs.process_save_queue();

  const ctxItem = await contexts.create_or_update({
    key: 'test_snapshot_context',
    context_items: {
      'test_integrationA.data': true,
      'test_integrationB.data': true
    },
    context_opts: {
      excluded_headings: ['Secret'],
      link_depth: 0,
      max_len: 0
    }
  });

  // Instead of calling get_snapshot on the context item, we show direct usage:
  const merged_opts = {
    link_depth: ctxItem.data.context_opts.link_depth,
    excluded_headings: ctxItem.data.context_opts.excluded_headings,
    max_len: ctxItem.data.context_opts.max_len,
    templates: {}
  };
  const snapshot = await build_snapshot(ctxItem, merged_opts);

  // Should have content from both sources, but the "Secret" heading omitted
  t.truthy(snapshot.items[0]['test_integrationA.data']);
  t.truthy(snapshot.items[0]['test_integrationB.data']);

  const itemAcontent = snapshot.items[0]['test_integrationA.data'];
  t.false(
    itemAcontent.includes('Should hide'),
    'excluded heading content removed'
  );
  t.true(
    itemAcontent.includes('Content A line'),
    'non-excluded heading is present'
  );
  t.is(
    snapshot.char_count,
    Object.values(snapshot.items[0]).reduce((acc, content) => acc + content.length, 0)
  );
});

/**
 * 5) link_depth expansions: outlinks at depth=1..2
 *    Verifies we gather outlinked files up to link_depth.
 *    Checks that if a file has an outlink, it appears at the correct depth.
 */
test.serial('Multi-depth outlink expansion with link_depth=2', async t => {
  /**
   * Setup:
   * mainFile -> outlink to subFile1
   * subFile1 -> outlink to subFile2
   * subFile2 -> no outlinks
   */
  await env.smart_sources.fs.write('mainFile.md', '# Main\nThis references subFile1\n');
  await env.smart_sources.fs.write('subFile1.md', '# Sub1\nsome content\n');
  await env.smart_sources.fs.write('subFile2.md', '# Sub2\nleaf content\n');
  await env.smart_sources.fs.load_files();
  await env.smart_sources.init_file_path('mainFile.md');
  await env.smart_sources.init_file_path('subFile1.md');
  await env.smart_sources.init_file_path('subFile2.md');
  Object.values(env.smart_sources.items).forEach(item => item.queue_import());
  await env.smart_sources.process_source_import_queue();
  
  // Insert outlinks metadata
  const mainSource = await env.smart_sources.create_or_update({
    key: 'mainFile.md',
    outlinks: ['subFile1.md']
  });
  mainSource.queue_save();
  const sub1Source = await env.smart_sources.create_or_update({
    key: 'subFile1.md',
    outlinks: ['subFile2.md']
  });
  sub1Source.queue_save();
  const sub2Source = await env.smart_sources.create_or_update({
    key: 'subFile2.md',
    outlinks: []
  });
  sub2Source.queue_save();
  await env.smart_sources.process_save_queue();

  // Create a SmartContext referencing mainFile at depth=0
  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testLinkDepth',
    context_items: {
      'mainFile.md': true
    }
  });

  // Build snapshot with link_depth=2
  const snapshot = await build_snapshot(sc_item, {
    link_depth: 2,
    max_len: 0,
    inlinks: false // outlinks only
  });

  // Expect depth=0 => mainFile.md
  // depth=1 => subFile1.md
  // depth=2 => subFile2.md
  t.truthy(snapshot.items[0]['mainFile.md'], 'Main file in depth=0');
  t.truthy(snapshot.items[1], 'Depth=1 object present');
  t.truthy(snapshot.items[1]['subFile1.md'], 'subFile1 included at depth=1');
  t.truthy(snapshot.items[2], 'Depth=2 object present');
  t.truthy(snapshot.items[2]['subFile2.md'], 'subFile2 included at depth=2');
});

/**
 * 6) inbound link test: if inlinks=true, gather inbound references
 *    mainFile references subFile, subFile references mainFile as inbound.
 *    If we start from subFile at depth=0 with inlinks=true, we discover mainFile at depth=1.
 */
test.serial('Inbound link expansions with inlinks=true', async t => {
  // Write content
  await env.smart_sources.fs.write('inboundMain.md', '# inboundMain\n[[inboundSub]]\n');
  await env.smart_sources.fs.write('inboundSub.md', '# inboundSub\n');
  await env.smart_sources.fs.load_files();
  await env.smart_sources.init_file_path('inboundMain.md');
  await env.smart_sources.init_file_path('inboundSub.md');
  Object.values(env.smart_sources.items).forEach(item => item.queue_import());
  await env.smart_sources.process_source_import_queue();
  env.smart_sources.build_links_map();
  
  // Now create a SmartContext referencing inboundSub.md
  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testInlinks',
    context_items: {
      'inboundSub.md': true
    }
  });

  // Build snapshot with link_depth=1 and inlinks=true => we gather inbound references
  const snapshot = await build_snapshot(sc_item, {
    link_depth: 1,
    inlinks: true,
    max_len: 0
  });
  // Expect depth=0 => inboundSub
  // depth=1 => inboundMain (via inbound link)
  t.truthy(snapshot.items[0]['inboundSub.md'], 'sub is at depth=0');
  t.truthy(snapshot.items[1], 'Should have depth=1 object');
  t.truthy(snapshot.items[1]['inboundMain.md'], 'We discovered inboundMain via subFile inlink');
});

/**
 * 7) partial truncation across multiple items: first item partial, second item skipped,
 *    then maybe a third smaller item fits fully. Tests the length-based sort logic as well.
 */
test.serial('Partial truncation with multiple items; smaller items can still fit later', async t => {
  /**
   * We'll create 3 files:
   * big1: 80 chars
   * big2: 70 chars
   * small1: 10 chars
   *
   * depth=0 => references all 3. Because the code sorts expansions by length ascending,
   * it will load small1 first, then big2, then big1. We verify final content.
   */
  const big_content1 = 'B1'.repeat(40); // 80 chars
  const big_content2 = 'B2'.repeat(35); // 70 chars
  const small_content = 'smallfile';    // 9 chars + newline => 10
  await env.smart_sources.fs.write('big1.md', big_content1);
  await env.smart_sources.fs.write('big2.md', big_content2);
  await env.smart_sources.fs.write('small1.md', small_content);
  await env.smart_sources.fs.load_files();
  await env.smart_sources.init_file_path('big1.md');
  await env.smart_sources.init_file_path('big2.md');
  await env.smart_sources.init_file_path('small1.md');
  Object.values(env.smart_sources.items).forEach(item => item.queue_import());
  await env.smart_sources.process_source_import_queue();

  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testPartialTrunc',
    context_items: {
      'big1.md': true,
      'big2.md': true,
      'small1.md': true
    }
  });

  // We'll set max_len=100. Because the code sorts expansions by length ascending,
  // the expansions array might add small1 (len=10), then big2 (len=70), then big1 (len=80).
  // The snapshot logic for depth=0 includes partial truncation for the *first* item that doesn't fit,
  // then subsequent items skip if they can't fit fully.
  const snapshot = await build_snapshot(sc_item, { link_depth: 0, max_len: 100 });

  // Let's see the final ordering in snapshot.items[0].
  const items0 = snapshot.items[0];
  t.truthy(items0['small1.md'], 'small1 should fit fully');
  t.truthy(items0['big2.md'], 'big2 should appear, possibly partially if it is first to exceed leftover => but it fits fully');
  t.falsy(items0['big1.md'], 'big1 likely skipped if big2 used up leftover');

  t.false(snapshot.truncated_items.includes('big2.md'), 'big2 fits fully, not truncated');
  t.true(snapshot.skipped_items.includes('big1.md'), 'big1 is too large, so we skip it');
});

/**
 * 8) multi-level codeblocks (a codeRef that itself has a ```smart-context block).
 *    Both references appear at the same depth=0. We verify repeated expansions for codeRef2.
 */
test.serial('Multi-level codeblocks: codeRef referencing another codeRef at same depth', async t => {
  const file_primaryB = `
    # PrimaryB
    \`\`\`smart-context
    codeRefLvl1.md
    \`\`\`
  `;
  const file_codeRefLvl1 = `
    # codeRefLvl1
    \`\`\`smart-context
    codeRefLvl2.md
    \`\`\`
  `;
  const file_codeRefLvl2 = `# codeRefLvl2\nthis is the second-level codeRef\n`;

  await env.smart_fs.adapter.write('primaryB.md', file_primaryB);
  await env.smart_fs.adapter.write('codeRefLvl1.md', file_codeRefLvl1);
  await env.smart_fs.adapter.write('codeRefLvl2.md', file_codeRefLvl2);

  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testMultiLevelCodeblocks',
    context_items: {
      'primaryB.md': true
    }
  });

  // link_depth=0 => expansions are all at the same depth from codeblocks
  const snapshot = await build_snapshot(sc_item, { link_depth: 0, max_len: 0 });

  // Depth=0 includes primaryB, codeRefLvl1, codeRefLvl2
  const depth0 = snapshot.items[0];
  t.truthy(depth0['primaryB.md'], 'primaryB included');
  t.truthy(depth0['codeRefLvl1.md'], 'codeRefLvl1 included');
  t.truthy(depth0['codeRefLvl2.md'], 'codeRefLvl2 included');
});

/**
 * 9) folder expansions with multiple sub-files: verify multiple files from the folder are included.
 *    We'll have 'folderMulti' with fileX.md and fileY.md. 
 *    We confirm they appear at depth=0 expansions if folder is included.
 */
test.serial('Folder expansions: multiple sub-files in a folder are included', async t => {
  await env.smart_sources.fs.mkdir('folderMulti');

  await env.smart_sources.fs.write('folderMulti/fileX.md', 'File X content');
  await env.smart_sources.fs.write('folderMulti/fileY.md', 'File Y content');
  await env.smart_sources.fs.write('folderMulti/another.md', 'Irrelevant extension');
  await env.smart_sources.fs.load_files();
  await env.smart_sources.init_file_path('folderMulti/fileX.md');
  await env.smart_sources.init_file_path('folderMulti/fileY.md');
  await env.smart_sources.init_file_path('folderMulti/another.md');
  Object.values(env.smart_sources.items).forEach(item => item.queue_import());
  await env.smart_sources.process_source_import_queue();

  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testFolderMulti',
    context_items: {
      'folderMulti': true
    }
  });

  const snapshot = await build_snapshot(sc_item, { link_depth: 0, max_len: 0 });

  // We expect depth=0 => fileX.md, fileY.md, and 'another.txt' as well
  const depth0 = snapshot.items[0];
  t.truthy(depth0['folderMulti/fileX.md'], 'folder subfile X included');
  t.truthy(depth0['folderMulti/fileY.md'], 'folder subfile Y included');
  t.truthy(depth0['folderMulti/another.md'], 'non-md file is still included as the code does not filter by extension');
});

/**
 * 10) Re-discovery of the same file at multiple expansions: only included once.
 *     We'll have mainA outlink to sharedFile, mainB outlink to sharedFile, both at depth=1.
 *     If we start with mainA & mainB at depth=0, the same sharedFile should appear only once at depth=1.
 */
test.serial('Re-discovery of the same file: only included once across expansions', async t => {
  // mainA.md -> outlink shared.md
  // mainB.md -> outlink shared.md
  await env.smart_sources.fs.write('mainA.md', '# mainA\n');
  await env.smart_sources.fs.write('mainB.md', '# mainB\n');
  await env.smart_sources.fs.write('shared.md', '# shared\ncommon content');
  await env.smart_sources.fs.load_files();
  await env.smart_sources.init_file_path('mainA.md');
  await env.smart_sources.init_file_path('mainB.md');
  await env.smart_sources.init_file_path('shared.md');
  Object.values(env.smart_sources.items).forEach(item => item.queue_import());
  await env.smart_sources.process_source_import_queue();

  const mainA_src = await env.smart_sources.create_or_update({
    key: 'mainA.md',
    outlinks: ['shared.md']
  });
  mainA_src.queue_save();

  const mainB_src = await env.smart_sources.create_or_update({
    key: 'mainB.md',
    outlinks: ['shared.md']
  });
  mainB_src.queue_save();

  const shared_src = await env.smart_sources.create_or_update({
    key: 'shared.md',
    outlinks: []
  });
  shared_src.queue_save();

  await env.smart_sources.process_save_queue();

  // Now create a context referencing mainA and mainB
  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testReDiscovery',
    context_items: {
      'mainA.md': true,
      'mainB.md': true
    }
  });

  const snapshot = await build_snapshot(sc_item, { link_depth: 1, max_len: 0 });

  // Depth=0 => mainA.md, mainB.md
  // Depth=1 => shared.md (once only)
  t.truthy(snapshot.items[0]['mainA.md'], 'mainA at depth=0');
  t.truthy(snapshot.items[0]['mainB.md'], 'mainB at depth=0');

  const depth1 = snapshot.items[1];
  t.truthy(depth1['shared.md'], 'shared is discovered');
  t.is(Object.keys(depth1).length, 1, 'shared.md only included once');
});

/**
 * 11) Nonexistent file references: if get_ref returns null or fs doesn't have the file, skip it.
 */
test.serial('Nonexistent file references should be skipped gracefully', async t => {
  // We reference "missingFile.md" which does not exist in the test FS
  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testMissingFile',
    context_items: {
      'missingFile.md': true
    }
  });

  const snapshot = await build_snapshot(sc_item, { link_depth: 0, max_len: 0 });
  // We expect that items[0] is empty because missingFile does not exist
  t.falsy(snapshot.items[0], 'No valid items at depth=0');
  t.true(snapshot.missing_items.includes('missingFile.md'), 'Missing file should be in missing_files');
});

/**
 * 12) Repeated or incomplete code blocks: multiple code blocks in the same file or no closing backticks
 *     We'll handle it gracefully (ignore incomplete code block).
 */
test.serial('Repeated or incomplete code blocks are handled gracefully', async t => {
  const content_many_blocks = `
    # Multi-block
    \`\`\`smart-context
    firstRef.md
    \`\`\`
    Some text
    \`\`\`smart-context
    secondRef.md
    thirdRef.md
    \`\`\`
    # Incomplete
    \`\`\`smart-context
    incompleteRef.md
    # missing closing \`\`\`
  `;
  await env.smart_sources.fs.write('multiBlock.md', content_many_blocks);
  await env.smart_sources.fs.write('firstRef.md', 'ref1');
  await env.smart_sources.fs.write('secondRef.md', 'ref2');
  await env.smart_sources.fs.write('thirdRef.md', 'ref3');
  // incompleteRef.md is never written => should be missing
  await env.smart_sources.fs.load_files();
  await env.smart_sources.init_file_path('multiBlock.md');
  await env.smart_sources.init_file_path('firstRef.md');
  await env.smart_sources.init_file_path('secondRef.md');
  await env.smart_sources.init_file_path('thirdRef.md');
  Object.values(env.smart_sources.items).forEach(item => item.queue_import());
  await env.smart_sources.process_source_import_queue();

  const sc_item = await env.smart_contexts.create_or_update({
    key: 'testMultiCodeBlocks',
    context_items: {
      'multiBlock.md': true
    }
  });

  const snapshot = await build_snapshot(sc_item, { link_depth: 0, max_len: 0 });
  const depth0 = snapshot.items[0];
  t.truthy(depth0['multiBlock.md'], 'Main file included');
  t.truthy(depth0['firstRef.md'], 'firstRef included from first codeblock');
  t.truthy(depth0['secondRef.md'], 'secondRef included from second codeblock');
  t.truthy(depth0['thirdRef.md'], 'thirdRef included from second codeblock');
  t.falsy(depth0['incompleteRef.md'], 'incompleteRef not captured, missing closing backticks => skip');
});


import path from 'path';
import fs from 'fs';
/**
 * This test verifies that an external folder reference in a codeblock is expanded
 * similarly to how a normal context folder is expanded, while also respecting
 * ignore patterns (e.g., hidden files).
 *
 * We place some subfiles in a local test folder using node fs, then reference that
 * folder inside a ```smart-context code block. We expect each subfile to appear at
 * the same snapshot depth as the original codeblock reference.
 */
test('Codeblock referencing an external folder: subfiles are expanded with ignoring', async t => {
  // 1) Create a local test folder on the real filesystem
  const testFolder = 'test_external_folder';
  const subA = path.join(testFolder, 'subA.txt');
  const subHidden = path.join(testFolder, '.hiddenfile');
  const subDir = path.join(testFolder, 'deep');
  const subDeepFile = path.join(testFolder, 'deep', 'nest.txt');
  const scignore = path.join(testFolder, '.scignore');

  // Clean up if existing
  try {
    fs.rmSync(testFolder, { recursive: true, force: true });
  } catch (_err) { /* ignore */ }
  fs.mkdirSync(testFolder);
  fs.writeFileSync(subA, 'Content A');
  fs.writeFileSync(subHidden, 'Secret Hidden Content');
  fs.mkdirSync(subDir);
  fs.writeFileSync(subDeepFile, 'Nested file');
  fs.writeFileSync(scignore, '.hiddenfile');
  await new Promise(resolve => setTimeout(resolve, 1000));
  // 2) Create a codeblock reference that references the folder
  const mainFile = `
    # MyDoc
    \`\`\`smart-context
    ../../${testFolder}
    \`\`\`
    # End
  `;

  // 3) Provide minimal environment
  const env = await SmartEnv.create({}, {
    env_path: '/Users/brian/Documents/jsbrains/smart-contexts/test/test-content',
    modules: {
      smart_fs: {
        class: SmartFs,
        adapter: NodeFsSmartFsAdapter
      }
    },
    collections: {
      smart_contexts: { class: SmartContexts }
    }
  });

  // Write 'myDoc.md' to in-memory test FS
  await env.smart_sources.fs.write('myDoc.md', mainFile);
  await env.smart_sources.fs.load_files();
  await env.smart_sources.init_file_path('myDoc.md');
  Object.values(env.smart_sources.items).forEach(item => item.queue_import());
  await env.smart_sources.process_source_import_queue();

  // Create the SmartContext referencing 'myDoc.md'
  const scItem = await env.smart_contexts.create_or_update({
    key: 'testExternalFolder',
    context_items: {
      'myDoc.md': true
    }
  });

  // 4) Build snapshot; link_depth=0, so we only see codeblock expansions at depth=0
  const snapshot = await build_snapshot(scItem, {
    link_depth: 0,
    max_len: 0,
    // Provide an example exclude to show hidden files are omitted or patterns are tested
    excluded_headings: [],
  });
  console.log(snapshot);

  // 5) Confirm expansions
  t.truthy(snapshot.items[0]['myDoc.md'], 'Original doc is included');
  t.truthy(snapshot.items[0][`${testFolder}/subA.txt`], 'Sub-file subA included');
  t.truthy(snapshot.items[0][`${testFolder}/deep/nest.txt`], 'Nested file is included');
  // For the hidden file, the new logic should skip it if we decide hidden => excluded
  t.falsy(snapshot.items[0][`${testFolder}/.hiddenfile`], 'Hidden file not expanded (excluded)');

  // Tidy real FS folder
  fs.rmSync(testFolder, { recursive: true, force: true });
});