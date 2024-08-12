import test from 'ava';
import { load_test_env } from './test_env.js';

test.beforeEach(t => {
  load_test_env(t);
});

test.serial('SmartSource move_to operation - new file', async t => {
    const env = t.context.mock_env;
    env.files['source.md'] = 'Initial content';
    const source = await env.smart_sources.create_or_update({ path: 'source.md' });

    await source.move_to('new_location.md');
    t.false(await env.fs.exists('source.md'), 'Old file should not exist');
    t.true(await env.fs.exists('new_location.md'), 'New file should exist');
    t.is(await env.fs.read('new_location.md'), 'Initial content', 'Content should be the same after moving');
});

test.serial('SmartSource move_to operation - existing file (merge)', async t => {
    const env = t.context.mock_env;
    env.files['from.md'] = 'from content';
    const source = await env.smart_sources.create_or_update({ path: 'from.md' });
    env.files['to.md'] = 'to content';
    const target = await env.smart_sources.create_or_update({ path: 'to.md' });
    // console.log(target.blocks);
    await source.move_to('to.md');
    t.false(await env.fs.exists('from.md'), 'Source file should not exist after move');
    t.is(await env.fs.read('to.md'), 'to content\n\nfrom content', 'Content should be merged');
});

test.serial('SmartBlock move_to operation - move to a new file', async t => {
  const env = t.context.mock_env;
  env.files['source.md'] = '# Header 1\nContent 1\n# Header 2\nContent 2';
  const source = await env.smart_sources.create_or_update({ path: 'source.md' });
  await source.parse_content();

  const block1 = source.blocks.sort((a, b) => a.line_start - b.line_start)[0];

  await block1.move_to('new_file.md');
  t.true(await env.fs.exists('new_file.md'), 'New file should exist');
  t.is(await env.fs.read('new_file.md'), '# Header 1\nContent 1', 'Moved block content should be in the new file');
  // trim whitespace because remove currently leaves behind a blank line
  t.is((await env.fs.read('source.md')).trim(), '# Header 2\nContent 2', 'Original file should only contain the remaining block');
});

test.serial('SmartBlock move_to operation - move to an existing file', async t => {
  const env = t.context.mock_env;
  env.files['source.md'] = '# Header 1\nContent 1\n# Header 2\nContent 2';
  const source = await env.smart_sources.create_or_update({ path: 'source.md' });
  await source.parse_content();

  const block2 = source.blocks[1];
  env.files['existing.md'] = 'Existing content';
  const target = await env.smart_sources.create_or_update({ path: 'existing.md' });
  await block2.move_to('existing.md');
  t.true(block2.deleted, 'Moved block should be marked for deletion');
  t.is(await env.fs.read('existing.md'), 'Existing content\n\n# Header 2\nContent 2', 'Block content should be appended to existing file');
});

test.serial('SmartBlock move_to operation - move within the same file', async t => {
  const env = t.context.mock_env;
  env.files['multi_block.md'] = '# Header 1\nContent 1\n# Header 2\nContent 2\n# Header 3\nContent 3';
  const multi_block_source = await env.smart_sources.create_or_update({ path: 'multi_block.md' });
  await multi_block_source.parse_content();

  const block_to_move = multi_block_source.blocks[0];
  await block_to_move.move_to('multi_block.md#Header 3');
  t.is(
    (await env.fs.read('multi_block.md')).trim(),
    '# Header 2\nContent 2\n# Header 3\nContent 3\n\n# Header 1\nContent 1',
    'Block should be moved to the end of the file'
  );
});
test.serial('SmartBlock move_to operation - move within the same file with sub-blocks', async t => {
  const env = t.context.mock_env;
  env.files['multi_block_with_subblocks.md'] = '# Header 1\nContent 1\n## Subheader\nSubcontent\n# Header 2\nContent 2\n# Header 3\nContent 3';
  const multi_block_source = await env.smart_sources.create_or_update({ path: 'multi_block_with_subblocks.md' });
  await multi_block_source.parse_content();
  const block_to_move = multi_block_source.blocks[0];
  await block_to_move.move_to('multi_block_with_subblocks.md#Header 3');
  t.is(
    (await env.fs.read('multi_block_with_subblocks.md')).trim(),
    '# Header 2\nContent 2\n# Header 3\nContent 3\n\n# Header 1\nContent 1\n\n## Subheader\nSubcontent',
    'Block should be moved to the end of the file'
  );
});

test.serial('SmartSource move_to operation with nested paths', async t => {
  const env = t.context.mock_env;
  env.files['folder1/source.md'] = 'Nested content';
  const source = await env.smart_sources.create_or_update({ path: 'folder1/source.md' });

  // Test move_to a new nested location
  await source.move_to('folder2/subfolder/new_location.md');
  t.false(await env.fs.exists('folder1/source.md'), 'Old file should not exist');
  t.true(await env.fs.exists('folder2/subfolder/new_location.md'), 'New file should exist in nested location');
  t.is(await env.fs.read('folder2/subfolder/new_location.md'), 'Nested content', 'Content should be the same after moving');
});

test.serial('SmartBlock move_to operation with headings - Parent Heading Block should move child heading blocks', async t => {
    const env = t.context.mock_env;
    env.files['source.md'] = '# Header 1\nContent 1\n## Subheader\nSubcontent\n# Header 2\nContent 2';
    const source = await env.smart_sources.create_or_update({ path: 'source.md' });
    await source.parse_content();
    
    t.is(source.blocks.length, 3, 'Source should have three blocks');
    t.is(source.blocks[0].data.path, 'source.md#Header 1', 'First block should have correct path');
    t.is(source.blocks[1].data.path, 'source.md#Header 1#Subheader', 'Second block should have correct path');
    t.is(source.blocks[2].data.path, 'source.md#Header 2', 'Third block should have correct path');

    const block_with_subheader = source.blocks[0];
    await block_with_subheader.move_to('new_file_with_subheader.md');

    t.true(await env.fs.exists('new_file_with_subheader.md'), 'New file should exist');
    t.is(
        await env.fs.read('new_file_with_subheader.md'),
        '# Header 1\nContent 1\n\n## Subheader\nSubcontent',
        'Moved block content should include subheader'
    );

    t.is((await env.fs.read('source.md')).trim(), '# Header 2\nContent 2', 'Original file should only contain the remaining block');
});