import test from 'ava';
import { build_snapshot } from './snapshot.js';


// Minimal mock environment
function create_mock_env(content_map = {}) {
  return {
    env: {
      fs: {
        async stat(path) {
          return { isDirectory: () => false };
        },
        async readdir(path) {
          return [];
        },
        async read(path) {
          // Return the mapped content if present, otherwise empty
          return content_map[path] || '';
        }
      },
      smart_sources: {},
      smart_blocks: {}
    }
  };
}

test('build_snapshot - no items returns empty snapshot', async t => {
  const mock_ctx_item = {
    data: { context_items: {} },
    env: create_mock_env().env,
    // No custom settings
    collection: { settings: {} }
  };
  // Pass link_depth=0 just for clarity
  const result = await build_snapshot(mock_ctx_item, { link_depth: 0 });
  t.deepEqual(result.items, {}, 'No items => items is an empty object');
  t.is(result.total_char_count, 0);
});

test('build_snapshot - single file under max_len', async t => {
  const mock_env = create_mock_env({
    'notes/fileA.md': 'Hello world'
  });
  const mock_ctx_item = {
    data: {
      context_items: { 'notes/fileA.md': true },
      context_opts: { max_len: 50 } // local context_opts
    },
    env: mock_env.env,
    collection: { settings: {} }
  };

  // We now merge in the item’s context_opts ourselves
  const snap = await build_snapshot(
    mock_ctx_item,
    mock_ctx_item.data.context_opts
  );
  t.is(Object.keys(snap.items[0]).length, 1);
  t.is(snap.items[0]['notes/fileA.md'], 'Hello world');
  t.is(snap.total_char_count, 11);
  t.deepEqual(snap.truncated_items, []);
  t.deepEqual(snap.skipped_items, []);
});

test('build_snapshot - item truncated if content too big', async t => {
  const mock_env = create_mock_env({
    'big.md': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  });
  const mock_ctx_item = {
    data: {
      context_items: { 'big.md': true },
      context_opts: { max_len: 10 }
    },
    env: mock_env.env,
    collection: { settings: {} }
  };

  // Must pass context_opts so max_len=10 is recognized
  const snap = await build_snapshot(
    mock_ctx_item,
    mock_ctx_item.data.context_opts
  );
  // Because it's the first (and only) item, partial truncation
  t.is(snap.items[0]['big.md'], 'ABCDEFGHIJ', 'Should be truncated to 10 chars');
  t.is(snap.total_char_count, 10);
  t.deepEqual(snap.truncated_items, ['big.md']);
  t.deepEqual(snap.skipped_items, []);
});

test('build_snapshot - skip entire item if no space left', async t => {
  const mock_env = create_mock_env({
    'fileA.md': '1111111',     // length=7
    'fileB.md': '2222222222'   // length=10
  });
  const mock_ctx_item = {
    data: {
      context_items: {
        'fileA.md': true,
        'fileB.md': true
      },
      context_opts: { max_len: 10 }
    },
    env: mock_env.env,
    collection: { settings: {} }
  };

  const snap = await build_snapshot(
    mock_ctx_item,
    mock_ctx_item.data.context_opts
  );
  // fileA => 7 chars => leftover=3 => fileB => length=10 => skip
  t.deepEqual(Object.keys(snap.items[0]), ['fileA.md']);
  t.is(snap.total_char_count, 7);
  t.deepEqual(snap.truncated_items, []);
  t.deepEqual(snap.skipped_items, ['fileB.md']);
});

test('build_snapshot - link_depth is 0 => no additional items', async t => {
  const mock_env = create_mock_env({
    'primary.md': 'Primary content'
  });
  const mock_ctx_item = {
    data: {
      context_items: { 'primary.md': true },
      context_opts: {}
    },
    env: mock_env.env,
    collection: { settings: { link_depth: 2 } }
  };
  // Force link_depth=0 in final opts
  const snap = await build_snapshot(mock_ctx_item, { link_depth: 0 });
  t.truthy(snap.items[0]['primary.md'], 'Primary included');
  t.falsy(snap.items[1], 'No depth=1 because link_depth=0');
});

test('build_snapshot - respects excluded_headings after gather', async t => {
  const mock_env = create_mock_env({
    'stuff.md': '# Title\nKeep me\n# Secret\nHide me\n# Another\nAlso keep'
  });
  const mock_ctx_item = {
    data: {
      context_items: { 'stuff.md': true },
      context_opts: {}
    },
    env: mock_env.env,
    collection: { settings: {} }
  };
  // exclude heading "Secret"
  const snap = await build_snapshot(mock_ctx_item, {
    excluded_headings: ['Secret'],
    link_depth: 0
  });
  t.true(snap.items[0]['stuff.md'].includes('Keep me'));
  t.false(
    snap.items[0]['stuff.md'].includes('Hide me'),
    'Should remove the "Secret" heading section'
  );
});

/* ------------------------------------------------------
 *  New integration test scenario with a real SmartEnv, etc.
 * ----------------------------------------------------*/
import { SmartEnv } from 'smart-environment';
import { SmartFs } from 'smart-file-system/smart_fs.js';
import { NodeFsSmartFsAdapter } from 'smart-file-system/adapters/node_fs.js';
import { SmartSources, SmartSource } from 'smart-sources';
import { MarkdownSourceContentAdapter } from 'smart-sources/adapters/markdown_source.js';
import { DataContentAdapter } from 'smart-sources/adapters/data_content.js';
import { SmartContext } from '../smart_context.js';
import { SmartContexts } from '../smart_contexts.js';
import ajson_data_adapter from 'smart-sources/adapters/data/ajson_multi_file.js';

class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_config() {
    return {
      env_path: '/Users/brian/Documents/jsbrains/smart-sources/test/test-content',
      modules: {
        smart_fs: {
          class: SmartFs,
          adapter: NodeFsSmartFsAdapter
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
        smart_contexts: {
          class: SmartContexts,
          data_adapter: ajson_data_adapter
        }
      },
      item_types: {
        SmartSource,
        SmartContext
      }
    };
  }
}

let env = null;

test.before(async () => {
  const main = new TestMain();
  env = await SmartEnv.create(main, main.smart_env_config);

  // Minimal test items in memory
  const srcs = env.smart_sources;
  const sourceA = await srcs.create_or_update({
    key: 'test_integrationA.data',
    content: '# Heading A\nContent A line\n# Secret\nShould hide\n'
  });
  console.log('sourceA', sourceA.adapter);
  sourceA.queue_save();
  const sourceB = await srcs.create_or_update({
    key: 'test_integrationB.data',
    content: '# Heading B\nContent B line\n'
  });
  sourceB.queue_save();
  await srcs.process_save_queue();
});

test('integration: build_snapshot with actual SmartEnv items', async t => {
  const contexts = env.smart_contexts;
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

  // Instead of calling build_snapshot directly, we can call ctxItem.get_snapshot:
  // (But let's show direct usage for test demonstration.)
  // We still need merged opts:
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
    snapshot.total_char_count,
    itemAcontent.length + snapshot.items[0]['test_integrationB.data'].length
  );
});
