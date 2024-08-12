import test from 'ava';
import { load_test_env } from './test_env.js';

test.beforeEach(t => {
  load_test_env(t);
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

// test replace_all with wrap_changes #2
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

// should handle simple merge with two files with only one line each
test.serial('SmartSource merge with two files with only one line each', async t => {
  const env = t.context.mock_env;
  env.files['from.md'] = 'from content';
  const from_source = await env.smart_sources.create_or_update({ path: 'from.md' });
  env.files['to.md'] = 'to content';
  const to_source = await env.smart_sources.create_or_update({ path: 'to.md' });
  await to_source.merge('from content', { mode: 'append_blocks' });
  t.is((await to_source.read()), 'to content\n\nfrom content', 'Content should be merged');
});