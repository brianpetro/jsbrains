import test from 'ava';
import { SmartSource } from './SmartSource.js';
import { SmartSources } from './SmartSources.js';
import { SmartBlock } from './SmartBlock.js';
import { SmartBlocks } from './SmartBlocks.js';
import { SmartChunks } from '../smart-chunks/smart_chunks.js';


const mock_env = {
  item_types: {
    SmartSource: SmartSource,
    SmartBlock: SmartBlock,
  },
  fs: {
    write: async (key, content) => {
      mock_env.files[key] = content;
    },
    append: async (key, content) => {
      mock_env.files[key] += content;
    },
    read: async (key) => {
      return mock_env.files[key];
    },
    remove: async (key) => {
      delete mock_env.files[key];
    },
    exists: async (key) => {
      return key in mock_env.files;
    },
    rename: async (old_key, new_key) => {
      mock_env.files[new_key] = `${mock_env.files[old_key]}`;
      delete mock_env.files[old_key];
    }
  },
  files: {},
  main: {
    read_file: async (path) => {
      return mock_env.files[path];
    },
    get_tfile: (path) => {
      return { stat: { mtime: Date.now(), size: 33 }, extension: 'md' };
    },
    get_link_target_path: (target, file_path) => {
      return target;
    },
    open_note: (path) => {
      console.log(`Opening note: ${path}`);
    },
    notices: {
      show: (id, messages, opts) => {
        console.log(`Notice [${id}]: ${messages.join(' ')}`);
      },
      remove: (id) => {
        console.log(`Notice [${id}] removed`);
      }
    }
  },
  links: {},
  save: () => {
    console.log('Environment saved');
  },
  is_included: (path) => {
    return true;
  }
};

mock_env.smart_chunks = new SmartChunks(mock_env);
mock_env.smart_blocks = new SmartBlocks(mock_env);
mock_env.smart_sources = new SmartSources(mock_env);
test.serial('SmartSource create operation', async t => {
  mock_env.files['test.md'] = '';
  const source = await mock_env.smart_sources.create_or_update({ path: 'test.md' } );

  // Test create
  await source.update('Initial content');
  t.is(await source.read(), 'Initial content', 'Content should be updated');
});

test.serial('SmartSource append operation', async t => {
  const source = mock_env.smart_sources.get('test.md');

  // Test append
  await source.update('Initial content');
  await source.append('Appended content');
  t.is(await source.read(), 'Initial content\nAppended content', 'Content should be appended');
});

test.serial('SmartSource rename operation', async t => {
  const source = mock_env.smart_sources.get('test.md');

  // Test rename
  await source.update('Initial content');
  await source.append('Appended content');
  await source.rename('renamed.md');
  t.is(await mock_env.fs.read('renamed.md'), 'Initial content\nAppended content', 'Content should be the same after renaming');
  t.false(await mock_env.fs.exists('test.md'), 'Old path should not exist');
  t.true(await mock_env.fs.exists('renamed.md'), 'New path should exist');
});

test.serial('SmartSource remove operation', async t => {
  const source = await mock_env.smart_sources.get('test.md');

  // Test remove
  await source.update('Initial content');
  await source.append('Appended content');
  await source.rename('renamed.md');
  const new_source = mock_env.smart_sources.get('renamed.md');
  await new_source.remove();
  t.false(await mock_env.fs.exists('renamed.md'), 'File should be removed');
});

test.serial('SmartSource merge operation', async t => {
  // Test merge
  mock_env.files['merge_to.md'] = '# h1\n## h2\nSome initial content\n### h3\nSome other initial content';
  const merge_to_source = await mock_env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge('Some unmatched content\n# h1\n## h2\nMerged content1\n### h3\nMerged content2');
  t.is((await merge_to_source.read()).trim(), '# h1\n## h2\nSome initial content\nMerged content1\n### h3\nSome other initial content\nMerged content2\n\n\nSome unmatched content', 'Content should be merged');
});
