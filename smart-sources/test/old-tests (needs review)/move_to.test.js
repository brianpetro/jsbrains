import test from 'ava';
import { load_test_env } from './_env.js';

test.beforeEach(async t => {
  await load_test_env(t);
});

test.serial('SmartSource move_to operation - new file', async t => {
    const env = t.context.env;
    
    await t.context.fs.write('source.md', 'Initial content');
    const source = await env.smart_sources.create_or_update({ path: 'source.md' });
    await source.move_to('new_location.md');
    t.false(await t.context.fs.exists('source.md'), 'Old file should not exist');
    t.true(await t.context.fs.exists('new_location.md'), 'New file should exist');
    t.is(await t.context.fs.read('new_location.md'), 'Initial content', 'Content should be the same after moving');
});

test.serial('SmartSource move_to operation - existing file (merge)', async t => {
    const env = t.context.env;
    
    await t.context.fs.write('from.md', 'from content');
    const source = await env.smart_sources.create_or_update({ path: 'from.md' });
    await t.context.fs.write('to.md', 'to content');
    const target = await env.smart_sources.create_or_update({ path: 'to.md' });
    await source.move_to('to.md');
    t.false(await t.context.fs.exists('from.md'), 'Source file should not exist after move');
    t.is(await t.context.fs.read('to.md'), 'to content\n\nfrom content', 'Content should be merged');
});

test.serial('SmartBlock move_to operation - move to a new file', async t => {
  const env = t.context.env;
  
  await t.context.fs.write('source.md', '# Header 1\nContent 1\n# Header 2\nContent 2');
  const source = await env.smart_sources.create_or_update({ path: 'source.md' });
  await source.parse_content();

  const block1 = source.blocks.sort((a, b) => a.line_start - b.line_start)[0];

  await block1.move_to('new_file.md');
  t.true(await t.context.fs.exists('new_file.md'), 'New file should exist');
  t.is(await t.context.fs.read('new_file.md'), '# Header 1\nContent 1', 'Moved block content should be in the new file');
  // trim whitespace because remove currently leaves behind a blank line
  t.is((await t.context.fs.read('source.md')).trim(), '# Header 2\nContent 2', 'Original file should only contain the remaining block');
});

test.serial('SmartBlock move_to operation - move to an existing file', async t => {
  const env = t.context.env;
  
  await t.context.fs.write('source.md', '# Header 1\nContent 1\n# Header 2\nContent 2');
  const source = await env.smart_sources.create_or_update({ path: 'source.md' });
  await source.parse_content();

  const block2 = source.blocks[1];
  await t.context.fs.write('existing.md', 'Existing content');
  const target = await env.smart_sources.create_or_update({ path: 'existing.md' });
  await block2.move_to('existing.md');
  t.true(block2.deleted, 'Moved block should be marked for deletion');
  t.is(await t.context.fs.read('existing.md'), 'Existing content\n\n# Header 2\nContent 2', 'Block content should be appended to existing file');
});

test.serial('SmartBlock move_to operation - move within the same file', async t => {
  const env = t.context.env;
  
  await t.context.fs.write('multi_block.md', '# Header 1\nContent 1\n# Header 2\nContent 2\n# Header 3\nContent 3');
  const multi_block_source = await env.smart_sources.create_or_update({ path: 'multi_block.md' });
  await multi_block_source.parse_content();

  const block_to_move = multi_block_source.blocks[0];
  await block_to_move.move_to('multi_block.md#Header 3');
  t.is(
    (await t.context.fs.read('multi_block.md')).trim(),
    '# Header 2\nContent 2\n# Header 3\nContent 3\n\n## Header 1\nContent 1',
    'Block should be moved to Header 3 block with added heading depth'
  );
});

test.serial('SmartBlock move_to operation - move within the same file with sub-blocks', async t => {
  const env = t.context.env;
  
  await t.context.fs.write('multi_block_with_subblocks.md', '# Header 1\nContent 1\n## Subheader\nSubcontent\n# Header 2\nContent 2\n# Header 3\nContent 3');
  const multi_block_source = await env.smart_sources.create_or_update({ path: 'multi_block_with_subblocks.md' });
  await multi_block_source.parse_content();
  const block_to_move = multi_block_source.blocks[0];
  await block_to_move.move_to('multi_block_with_subblocks.md#Header 3');
  t.is(
    (await t.context.fs.read('multi_block_with_subblocks.md')).trim(),
    '# Header 1\n## Subheader\nSubcontent\n# Header 2\nContent 2\n# Header 3\nContent 3\n\n## Header 1\nContent 1',
    'Block should be moved to the end of the file, leaving behind the parent heading'
  );
});

test.serial('SmartBlock move_to operation - preserve sub-block keys when moving', async t => {
  const env = t.context.env;
  
  await t.context.fs.write('source_with_subblocks.md', '# Header 1\nContent 1\n## Subheader 1\nSubcontent 1\n## Subheader 2\nSubcontent 2\n# Header 2\nContent 2');
  const source = await env.smart_sources.create_or_update({ path: 'source_with_subblocks.md' });
  await source.parse_content();

  const block_to_move = source.blocks.find(b => b.data.path === 'source_with_subblocks.md#Header 1');
  const sub_block_1 = source.blocks.find(b => b.data.path === 'source_with_subblocks.md#Header 1#Subheader 1');
  const sub_block_2 = source.blocks.find(b => b.data.path === 'source_with_subblocks.md#Header 1#Subheader 2');

  await block_to_move.move_to('new_file.md');

  t.true(await t.context.fs.exists('new_file.md'), 'New file should be created');
  t.is(
    await t.context.fs.read('new_file.md'),
    '# Header 1\nContent 1',
    'Moved block content should include subheaders in the new file'
  );
  t.is(
    (await t.context.fs.read('source_with_subblocks.md')).trim(),
    '# Header 1\n## Subheader 1\nSubcontent 1\n## Subheader 2\nSubcontent 2\n# Header 2\nContent 2',
    'Original file should retain the parent heading and other content'
  );

  // Check if sub-block keys are preserved
  await source.parse_content();
  t.truthy(source.blocks.find(b => b.data.path === 'source_with_subblocks.md#Header 1#Subheader 1'), 'Sub-block 1 key should be preserved');
  t.truthy(source.blocks.find(b => b.data.path === 'source_with_subblocks.md#Header 1#Subheader 2'), 'Sub-block 2 key should be preserved');
});

test.serial('SmartSource move_to operation with nested paths', async t => {
  const env = t.context.env;
  await t.context.fs.write('folder1/source.md', 'Nested content');
  const source = await env.smart_sources.create_or_update({ path: 'folder1/source.md' });

  await source.move_to('folder2/subfolder/new_location.md');
  t.false(await t.context.fs.exists('folder1/source.md'), 'Old file should not exist');
  t.true(await t.context.fs.exists('folder2/subfolder/new_location.md'), 'New file should exist in nested location');
  t.is(await t.context.fs.read('folder2/subfolder/new_location.md'), 'Nested content', 'Content should be the same after moving');
});

test.serial('SmartBlock move_to operation with headings - Parent Heading Block should NOT move child heading blocks', async t => {
    const env = t.context.env;
    
    await t.context.fs.write('source.md', '# Header 1\nContent 1\n## Subheader\nSubcontent\n# Header 2\nContent 2');
    const source = await env.smart_sources.create_or_update({ path: 'source.md' });
    await source.parse_content();
    
    t.is(source.blocks.length, 3, 'Source should have three blocks');
    t.is(source.blocks[0].data.path, 'source.md#Header 1', 'First block should have correct path');
    t.is(source.blocks[1].data.path, 'source.md#Header 1#Subheader', 'Second block should have correct path');
    t.is(source.blocks[2].data.path, 'source.md#Header 2', 'Third block should have correct path');

    const block_with_subheader = source.blocks[0];
    await block_with_subheader.move_to('new_file_with_subheader.md');

    t.true(await t.context.fs.exists('new_file_with_subheader.md'), 'New file should exist');
    t.is(
        await t.context.fs.read('new_file_with_subheader.md'),
        '# Header 1\nContent 1',
        'Moved block content should NOT include subheader'
    );

    t.is((await t.context.fs.read('source.md')).trim(), '# Header 1\n## Subheader\nSubcontent\n# Header 2\nContent 2', 'Original file should contain the subheader and remaining block');
});

test.serial('SmartSource move_to operation - new nested folder', async t => {
    const env = t.context.env;
    
    await t.context.fs.write('source.md', 'Initial content');
    const source = await env.smart_sources.create_or_update({ path: 'source.md' });

    await source.move_to('new_folder/subfolder/new_location.md');
    t.false(await t.context.fs.exists('source.md'), 'Old file should not exist');
    t.true(await t.context.fs.exists('new_folder/subfolder/new_location.md'), 'New file should exist in nested location');
    t.is(await t.context.fs.read('new_folder/subfolder/new_location.md'), 'Initial content', 'Content should be the same after moving');
});

test.serial('SmartSource move_to operation - existing file (merge with replace_all)', async t => {
    const env = t.context.env;
    
    await t.context.fs.write('from.md', '# Header 1\nContent 1\n# Header 2\nContent 2');
    const source = await env.smart_sources.create_or_update({ path: 'from.md' });
    await t.context.fs.write('to.md', '# Existing Header\nExisting content');
    const target = await env.smart_sources.create_or_update({ path: 'to.md' });

    await source.move_to('to.md');
    t.false(await t.context.fs.exists('from.md'), 'Source file should not exist after move');
    t.is(await t.context.fs.read('to.md'), '# Existing Header\nExisting content\n\n# Header 1\nContent 1\n# Header 2\nContent 2', 'Content should be merged with replace_all mode');
});

test.serial('SmartBlock move_to operation - move to a non-existent file', async t => {
    const env = t.context.env;
    
    await t.context.fs.write('source.md', '# Header 1\nContent 1\n# Header 2\nContent 2');
    const source = await env.smart_sources.create_or_update({ path: 'source.md' });
    await source.parse_content();

    const block1 = source.blocks.find(b => b.data.path === 'source.md#Header 1');

    await block1.move_to('non_existent.md');
    t.true(await t.context.fs.exists('non_existent.md'), 'New file should be created');
    t.is(await t.context.fs.read('non_existent.md'), '# Header 1\nContent 1', 'Moved block content should be in the new file');
    t.is((await t.context.fs.read('source.md')).trim(), '# Header 2\nContent 2', 'Original file should only contain the remaining block');
});

test.serial('SmartBlock move_to operation - move block without nested subheadings', async t => {
    const env = t.context.env;
    
    await t.context.fs.write('source.md', '# Header 1\nContent 1\n## Subheader 1\nSubcontent 1\n### Sub-subheader\nSub-subcontent\n# Header 2\nContent 2');
    const source = await env.smart_sources.create_or_update({ path: 'source.md' });
    await source.parse_content();

    const block1 = source.blocks.find(b => b.data.path === 'source.md#Header 1');

    await block1.move_to('new_file.md');
    t.true(await t.context.fs.exists('new_file.md'), 'New file should exist');
    t.is(await t.context.fs.read('new_file.md'), '# Header 1\nContent 1', 'Moved block content should NOT include nested subheadings');
    t.is((await t.context.fs.read('source.md')).trim(), '# Header 1\n## Subheader 1\nSubcontent 1\n### Sub-subheader\nSub-subcontent\n# Header 2\nContent 2', 'Original file should contain the remaining blocks including subheadings');
});

test.serial('SmartBlock move_to operation - move to specific position in existing file', async t => {
    const env = t.context.env;
    
    await t.context.fs.write('source.md', '# Header 1\nContent 1\n# Header 2\nContent 2');
    const source = await env.smart_sources.create_or_update({ path: 'source.md' });
    await source.parse_content();

    await t.context.fs.write('target.md', '# Existing Header\nExisting content\n# Another Header\nMore content');
    const target = await env.smart_sources.create_or_update({ path: 'target.md' });
    await target.parse_content();

    const block2 = source.blocks.find(b => b.data.path === 'source.md#Header 2');

    await block2.move_to('target.md#Another Header');
    t.is(await t.context.fs.read('target.md'), '# Existing Header\nExisting content\n# Another Header\nMore content\n\n## Header 2\nContent 2', 'Moved block should be inserted after the specified header');
    t.is((await t.context.fs.read('source.md')).trim(), '# Header 1\nContent 1', 'Original file should only contain the remaining block');
});


test.serial('SmartSource move_to block within the same source', async t => {
  const env = t.context.env;
  await t.context.fs.write('source.md', '# Header 1\nContent 1\n# Header 2\nContent 2');
  const source = await env.smart_sources.create_or_update({ path: 'source.md' });
  await source.parse_content();

  await source.move_to('source.md#Header 2');
  t.is(
    await t.context.fs.read('source.md'),
    '# Header 1\nContent 1\n# Header 2\nContent 2\n\n## Header 1\nContent 1\n## Header 2\nContent 2',
    'Content should be moved to the specified block with correct heading levels'
  );
});