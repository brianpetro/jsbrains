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

const initial_merge_content = `# h1
## h2
Some initial content
### h3
Some other initial content`;
const merge_content_input = `Some unmatched content
# h1
## h2
Merged content1
### h3
Merged content2`;
const expected_merge_append_blocks_output = `# h1
## h2
Some initial content
Merged content1
### h3
Some other initial content
Merged content2


Some unmatched content`;
test.serial('SmartSource merge (mode=append_blocks) operation', async t => {
  // Test merge
  mock_env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await mock_env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge(merge_content_input, { mode: 'append_blocks' });
  t.is((await merge_to_source.read()).trim(), expected_merge_append_blocks_output.trim(), 'Content should be merged');
});
const merge_replace_blocks_content_input = `Some unmatched content
# h1
## h2
Replaced content1
### h3
Replaced content2`;

const expected_merge_replace_blocks_output = `# h1
## h2
Replaced content1
### h3
Replaced content2


Some unmatched content`;
test.serial('SmartSource merge (mode=replace_blocks) operation', async t => {
  mock_env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await mock_env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge(merge_replace_blocks_content_input, { mode: 'replace_blocks' });
  t.is((await merge_to_source.read()).trim(), expected_merge_replace_blocks_output.trim(), 'Content should be merged');
});


const expected_merge_replace_all_output = `replaced content`;
test.serial('SmartSource merge (mode=replace_all) operation', async t => {
  mock_env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await mock_env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge('replaced content', { mode: 'replace_all' });
  t.is((await merge_to_source.read()).trim(), expected_merge_replace_all_output, 'Content should be merged');
});