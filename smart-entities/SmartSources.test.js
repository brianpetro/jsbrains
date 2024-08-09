import test from 'ava';
import { SmartSource } from './SmartSource.js';
import { SmartSources } from './SmartSources.js';
import { SmartBlock } from './SmartBlock.js';
import { SmartBlocks } from './SmartBlocks.js';
import { SmartChunks } from '../smart-chunks/smart_chunks.js';

test.beforeEach(t => {
  t.context.mock_env = {
    item_types: {
      SmartSource: SmartSource,
      SmartBlock: SmartBlock,
    },
    fs: {
      write: async (key, content) => {
        t.context.mock_env.files[key] = content;
      },
      append: async (key, content) => {
        t.context.mock_env.files[key] += content;
      },
      read: async (key) => {
        return t.context.mock_env.files[key];
      },
      remove: async (key) => {
        delete t.context.mock_env.files[key];
      },
      exists: async (key) => {
        return key in t.context.mock_env.files;
      },
      rename: async (old_key, new_key) => {
        t.context.mock_env.files[new_key] = `${t.context.mock_env.files[old_key]}`;
        delete t.context.mock_env.files[old_key];
      }
    },
    files: {},
    main: {
      read_file: async (path) => {
        return t.context.mock_env.files[path];
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
    },
    settings: {}
  };
  t.context.mock_env.smart_chunks = new SmartChunks(t.context.mock_env);
  t.context.mock_env.smart_blocks = new SmartBlocks(t.context.mock_env);
  t.context.mock_env.smart_sources = new SmartSources(t.context.mock_env);
});
test.serial('SmartSource create operation', async t => {
  const env = t.context.mock_env;
  env.files['test.md'] = 'test';
  const source = await env.smart_sources.create_or_update({ path: 'test.md' } );

  // Test create
  await source.update('Initial content');
  t.is(await source.read(), 'Initial content', 'Content should be updated');
});

test.serial('SmartSource append operation', async t => {
  const env = t.context.mock_env;
  env.files['test.md'] = 'test';
  const source = await env.smart_sources.create_or_update({ path: 'test.md' } );

  // Test append
  await source.update('Initial content');
  await source.append('Appended content');
  t.is(await source.read(), 'Initial content\nAppended content', 'Content should be appended');
});

test.serial('SmartSource rename operation', async t => {
  const env = t.context.mock_env;
  env.files['test.md'] = 'test';
  const source = await env.smart_sources.create_or_update({ path: 'test.md' } );

  // Test rename
  await source.update('Initial content');
  await source.append('Appended content');
  await source.rename('renamed.md');
  t.is(await env.fs.read('renamed.md'), 'Initial content\nAppended content', 'Content should be the same after renaming');
  t.false(await env.fs.exists('test.md'), 'Old path should not exist');
  t.true(await env.fs.exists('renamed.md'), 'New path should exist');
});

test.serial('SmartSource remove operation', async t => {
  const env = t.context.mock_env;
  env.files['test.md'] = 'test';
  const source = await env.smart_sources.create_or_update({ path: 'test.md' } );

  // Test remove
  await source.update('Initial content');
  await source.append('Appended content');
  await source.rename('renamed.md');
  const new_source = await env.smart_sources.get('renamed.md');
  await new_source.remove();
  t.false(await env.fs.exists('renamed.md'), 'File should be removed');
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
// append_blocks
test.serial('SmartSource merge (mode=append_blocks) operation', async t => {
  // Test merge
  const env = t.context.mock_env;
  env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge(merge_content_input, { mode: 'append_blocks' });
  t.is((await merge_to_source.read()).trim(), expected_merge_append_blocks_output.trim(), 'Content should be merged');
});
// test append_blocks with wrap_changes
const expected_merge_append_blocks_output_with_change_syntax = `# h1
  ## h2
  Some initial content
  <<<<<<< HEAD
  =======
  Merged content1
  >>>>>>>
  ### h3
  Some other initial content
  <<<<<<< HEAD
  =======
  Merged content2
  >>>>>>>
  <<<<<<< HEAD
  =======


  Some unmatched content
  >>>>>>>`.split("\n").map(line => line.trim()).join("\n");
;
test.serial('SmartSource merge (mode=append_blocks) with wrap_changes', async t => {
  const env = t.context.mock_env;
  env.settings.use_change_syntax = true;
  env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge(merge_content_input, { mode: 'append_blocks' });
  t.is((await merge_to_source.read()).trim(), expected_merge_append_blocks_output_with_change_syntax.trim(), 'Content should be merged');
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
// replace_blocks
test.serial('SmartSource merge (mode=replace_blocks) operation', async t => {
  const env = t.context.mock_env;
  env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge(merge_replace_blocks_content_input, { mode: 'replace_blocks' });
  t.is((await merge_to_source.read()).trim(), expected_merge_replace_blocks_output.trim(), 'Content should be merged');
});
// test replace_blocks with wrap_changes
const expected_merge_replace_blocks_output_with_change_syntax = `# h1
  <<<<<<< HEAD
  ## h2
  Some initial content
  =======
  ## h2
  Replaced content1
  >>>>>>>
  <<<<<<< HEAD
  ### h3
  Some other initial content
  =======
  ### h3
  Replaced content2
  >>>>>>>
  <<<<<<< HEAD
  =======


  Some unmatched content
  >>>>>>>`.split("\n").map(line => line.trim()).join("\n");
;
test.serial('SmartSource merge (mode=replace_blocks) with wrap_changes', async t => {
  const env = t.context.mock_env;
  env.settings.use_change_syntax = true;
  env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge(merge_replace_blocks_content_input, { mode: 'replace_blocks' });
  t.is((await merge_to_source.read()).trim(), expected_merge_replace_blocks_output_with_change_syntax.trim(), 'Content should be merged');
});

// replace_all
const expected_merge_replace_all_output = `replaced content`;
test.serial('SmartSource merge (mode=replace_all) operation', async t => {
  const env = t.context.mock_env;
  env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge('replaced content', { mode: 'replace_all' });
  t.is((await merge_to_source.read()).trim(), expected_merge_replace_all_output, 'Content should be merged');
});
// test replace_all with wrap_changes
const expected_merge_replace_all_output_with_change_syntax = `<<<<<<< HEAD
  =======
  replaced content
  >>>>>>>
  <<<<<<< HEAD
  ## h2
  Some initial content
  =======
  >>>>>>>
  <<<<<<< HEAD
  ### h3
  Some other initial content
  =======
  >>>>>>>`.split("\n").map(line => line.trim()).join("\n");
test.serial('SmartSource merge (mode=replace_all) with wrap_changes', async t => {
  const env = t.context.mock_env;
  env.settings.use_change_syntax = true;
  env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge('replaced content', { mode: 'replace_all' });
  t.is((await merge_to_source.read()).trim(), expected_merge_replace_all_output_with_change_syntax, 'Content should be merged');
});

// test replace_all with wrap_changes
const expected_merge_replace_all_input_2 = `# h1
## h2
replaced content`;
const expected_merge_replace_all_output_with_change_syntax_2 = `# h1
  <<<<<<< HEAD
  ## h2
  Some initial content
  =======
  ## h2
  replaced content
  >>>>>>>
  <<<<<<< HEAD
  ### h3
  Some other initial content
  =======
  >>>>>>>`.split("\n").map(line => line.trim()).join("\n");
test.serial('SmartSource merge (mode=replace_all) with wrap_changes #2', async t => {
  const env = t.context.mock_env;
  env.settings.use_change_syntax = true;
  env.files['merge_to.md'] = initial_merge_content;
  const merge_to_source = await env.smart_sources.create_or_update({ path: 'merge_to.md' });
  await merge_to_source.merge(expected_merge_replace_all_input_2, { mode: 'replace_all' });
  t.is((await merge_to_source.read()).trim(), expected_merge_replace_all_output_with_change_syntax_2, 'Content should be merged');
});