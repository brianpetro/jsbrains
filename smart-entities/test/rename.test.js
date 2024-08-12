import test from 'ava';
import { load_test_env } from './test_env.js';

test.beforeEach(t => {
  load_test_env(t);
});

test.serial('SmartSource rename operation', async t => {
  const env = t.context.mock_env;
  env.files['test.md'] = 'test';
  const source = await env.smart_sources.create_or_update({ path: 'test.md' });

  // Test rename
  await source.update('Initial content');
  await source.append('Appended content');
  await source.rename('renamed.md');
  t.is(await env.fs.read('renamed.md'), 'Initial content\n\nAppended content', 'Content should be the same after renaming');
  t.false(await env.fs.exists('test.md'), 'Old path should not exist');
  t.true(await env.fs.exists('renamed.md'), 'New path should exist');
});