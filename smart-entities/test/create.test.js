import test from 'ava';
import { load_test_env } from './test_env.js';

test.beforeEach(t => {
  load_test_env(t);
});

test.serial('SmartSource create operation', async t => {
  const env = t.context.mock_env;
  await env.smart_fs.write('test.md', 'test');
  const source = await env.smart_sources.create_or_update({ path: 'test.md' } );

  // Test create
  await source.update('Initial content');
  t.is(await source.read(), 'Initial content', 'Content should be updated');
});