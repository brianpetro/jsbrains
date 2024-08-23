import test from 'ava';
import { SmartFs } from './smart_fs.js';
import { glob_to_regex } from './utils/match_glob.js';
// Mock adapter for testing
class MockAdapter {
  constructor() {
    this.calls = [];
  }

  async mockMethod(...args) {
    this.calls.push({ method: 'mockMethod', args });
    return args;
  }
}

test('SmartFs.use_adapter calls adapter method and applies pre/post processing', async t => {
  const env = { config: { fs_path: '/test/path' } };
  const smart_fs = new SmartFs(env, { adapter: MockAdapter });

  // Mock excluded patterns
  smart_fs.excluded_patterns = [glob_to_regex('*.excluded')];

  await smart_fs.use_adapter('mockMethod', ['file.txt'], 'arg1', 'arg2');

  t.deepEqual(smart_fs.adapter.calls, [{ method: 'mockMethod', args: ['file.txt', 'arg1', 'arg2'] }]);
});

test('SmartFs.pre_process throws error for excluded paths', async t => {
  const env = { config: { fs_path: '/test/path' } };
  const smart_fs = new SmartFs(env, { adapter: MockAdapter });

  smart_fs.excluded_patterns = [glob_to_regex('*.excluded')];

  await t.throwsAsync(
    async () => smart_fs.pre_process(['file.txt', 'file.excluded']),
    { message: 'Path is excluded: file.excluded' }
  );
});

test('SmartFs.post_process filters out excluded paths', t => {
  const env = { config: { fs_path: '/test/path' } };
  const smart_fs = new SmartFs(env, { adapter: MockAdapter });

  smart_fs.excluded_patterns = [glob_to_regex('*.excluded')];

  const result = smart_fs.post_process(['file.txt', 'file.excluded', 'another.txt']);
  t.deepEqual(result, ['file.txt', 'another.txt']);
});

test('SmartFs constructor throws error when adapter is not set', async t => {
  const env = { config: { fs_path: '/test/path' } };
  await t.throwsAsync(
    async () => new SmartFs(env, { adapter: null }),
    { message: 'SmartFs requires an adapter' }
  );
});

test('SmartFs.use_adapter throws error when method is not found in adapter', async t => {
  const env = { config: { fs_path: '/test/path' } };
  const smart_fs = new SmartFs(env, { adapter: MockAdapter });

  await t.throwsAsync(
    async () => smart_fs.use_adapter('nonExistentMethod', ['file.txt']),
    { message: 'Method nonExistentMethod not found in adapter' }
  );
});
