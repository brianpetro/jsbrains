import test from 'ava';
import { load_test_env } from './test_env.js';

test.beforeEach(t => {
  load_test_env(t);
});

test.serial('SmartSource append operation', async t => {
  const env = t.context.mock_env;
  env.files['test.md'] = 'test';
  const source = await env.smart_sources.create_or_update({ path: 'test.md' });

  // Test append
  await source.update('Initial content');
  await source.append('Appended content');
  t.is(await source.read(), 'Initial content\n\nAppended content', 'Content should be appended');
});