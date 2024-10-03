import test from 'ava';
import { SmartFs } from './smart_fs.js';
import { glob_to_regex } from './utils/match_glob.js';
import { SmartFsTestAdapter } from './adapters/_test.js';

test('SmartFs.use_adapter calls adapter method and applies pre/post processing', async t => {
  const env = { config: { fs_path: '/test/path' } };
  const smart_fs = new SmartFs(env, { adapter: SmartFsTestAdapter });

  // Mock excluded patterns
  smart_fs.excluded_patterns = [glob_to_regex('*.excluded')];

  await smart_fs.use_adapter('write', ['file.txt'], 'some_text');
  await smart_fs.load_files();

  t.deepEqual(smart_fs.files, { 'file.txt': {
    path: 'file.txt',
    type: 'file',
    extension: 'txt',
    name: 'file.txt',
    basename: 'file',
  } });
  t.truthy(smart_fs.files['file.txt'].stat);
});

test('SmartFs.pre_process throws error for excluded paths', async t => {
  const env = { config: { fs_path: '/test/path' } };
  const smart_fs = new SmartFs(env, { adapter: SmartFsTestAdapter });

  smart_fs.excluded_patterns = [glob_to_regex('*.excluded')];

  await t.throwsAsync(
    async () => smart_fs.pre_process(['file.txt', 'file.excluded']),
    { message: 'Path is excluded: file.excluded' }
  );
});

test('SmartFs.post_process filters out excluded paths', t => {
  const env = { config: { fs_path: '/test/path' } };
  const smart_fs = new SmartFs(env, { adapter: SmartFsTestAdapter });

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
  const smart_fs = new SmartFs(env, { adapter: SmartFsTestAdapter });

  await t.throwsAsync(
    async () => smart_fs.use_adapter('nonExistentMethod', ['file.txt']),
    { message: 'Method nonExistentMethod not found in adapter' }
  );
});

test('SmartFs.load_files builds files and file_paths correctly', async t => {
  const env = { config: { fs_path: '/test/path' } };
  const smart_fs = new SmartFs(env, { adapter: SmartFsTestAdapter });

  // Set up mock files in the test adapter
  await smart_fs.adapter.write('file1.txt', 'Content 1');
  await smart_fs.adapter.write('folder/file2.txt', 'Content 2');
  await smart_fs.adapter.write('folder/subfolder/file3.txt', 'Content 3');

  // Call load_files
  await smart_fs.load_files();

  // Check files object
  t.truthy(smart_fs.files['file1.txt']);
  t.truthy(smart_fs.files['folder/file2.txt']);
  t.truthy(smart_fs.files['folder/subfolder/file3.txt']);

  t.is(smart_fs.files['file1.txt'].type, 'file');
  t.is(smart_fs.files['file1.txt'].extension, 'txt');
  t.is(smart_fs.files['file1.txt'].name, 'file1.txt');
  t.is(smart_fs.files['file1.txt'].basename, 'file1');

  // Check file_paths array
  t.deepEqual(smart_fs.file_paths.sort(), [
    'file1.txt',
    'folder/file2.txt',
    'folder/subfolder/file3.txt'
  ].sort());

  // Check folders object
  t.truthy(smart_fs.folders['folder']);
  t.truthy(smart_fs.folders['folder/subfolder']);

  t.is(smart_fs.folders['folder'].type, 'folder');
  t.is(smart_fs.folders['folder'].name, 'folder');

  // Check folder_paths array
  t.deepEqual(smart_fs.folder_paths.sort(), [
    'folder',
    'folder/subfolder'
  ].sort());
});
