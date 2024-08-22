import test from 'ava';
import { load_test_env } from './_env.js';

test.beforeEach(async t => {
  await load_test_env(t);
});

test.serial('SmartSource remove operation', async t => {
  const env = t.context.env;
  await env.fs.write('test.md', 'test');
  const source = await env.smart_sources.create_or_update({ path: 'test.md' });

  await source.update('Initial content');
  await source.destroy();
  t.false(await env.fs.exists('test.md'), 'File should be removed');
});

test.serial('SmartSource remove operation on nested file', async t => {
  const env = t.context.env;
  const nested_path = 'folder1/folder2/nested_test.md';
  await env.fs.write(nested_path, 'test');
  const source = await env.smart_sources.create_or_update({ path: nested_path });

  await source.update('Nested content');
  await source.destroy();
  t.false(await env.fs.exists(nested_path), 'Nested file should be removed');
});

test.serial('SmartSource remove operation and recreate', async t => {
  const env = t.context.env;
  await env.fs.write('test.md', 'Initial content');
  
  const source1 = await env.smart_sources.create_or_update({ path: 'test.md' });
  await source1.destroy();
  
  const source2 = await env.smart_sources.create('test.md', 'New content');
  
  t.is(await source2.read(), 'New content', 'File should be recreated with new content after removal');
});