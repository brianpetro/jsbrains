import test from 'ava';
import { load_test_env } from './_env.js';
import { SmartDirectory } from '../smart_directory.js';
import { SmartDirectories } from '../smart_directories.js';

test.beforeEach(load_test_env);

test('SmartDirectories initialization', async t => {
  const { env } = t.context;
  t.truthy(env.smart_directories instanceof SmartDirectories);
});

test('Create and read directory', async t => {
  const { env } = t.context;
  const dir_path = 'test_dir';
  
  const dir = await env.smart_directories.create_or_update({ path: dir_path });
  t.true(dir instanceof SmartDirectory);
  
  const contents = await dir.read();
  t.is(contents.length, 0);
});

test('Move directory', async t => {
  const { env } = t.context;
  const old_path = 'old_dir';
  const new_path = 'new_dir';
  
  const dir = await env.smart_directories.create_or_update({ path: old_path });
  await dir.move_to(new_path);
  
  t.is(dir.data.path, new_path);
  t.falsy(await env.fs.exists(old_path));
  t.truthy(await env.fs.exists(new_path));
});

test('Remove directory', async t => {
  const { env } = t.context;
  const dir_path = 'to_remove';
  
  const dir = await env.smart_directories.create_or_update({ path: dir_path });
  await dir.remove();
  
  t.falsy(await env.fs.exists(dir_path));
  t.falsy(env.smart_directories.get(dir.key));
});

test('Handle nested directory operations', async t => {
  const { env } = t.context;
  const parent_path = 'parent';
  const child_path = 'parent/child';
  
  await env.smart_directories.create_or_update({ path: parent_path });
  const child = await env.smart_directories.create_or_update({ path: child_path });
  
  t.truthy(await env.fs.exists(child_path));
  
  await child.move_to('new_parent/child');
  t.truthy(await env.fs.exists('new_parent/child'));
  t.falsy(await env.fs.exists(child_path));
});

test('Move directory to non-existent path', async t => {
  const { env } = t.context;
  const old_path = 'existing_dir';
  const new_path = 'non_existent/new_dir';
  
  const dir = await env.smart_directories.create_or_update({ path: old_path });
  await dir.move_to(new_path);
  
  t.is(dir.data.path, new_path);
  t.truthy(await env.fs.exists(new_path));
});

test('Move directory to existing path', async t => {
  const { env } = t.context;
  const dir1_path = 'dir1';
  const dir2_path = 'dir2';
  
  await env.smart_directories.create_or_update({ path: dir1_path });
  const dir2 = await env.smart_directories.create_or_update({ path: dir2_path });
  
  await t.throwsAsync(async () => {
    await dir2.move_to(dir1_path);
  }, { message: /already exists/ });
});

test('Remove non-empty directory', async t => {
  const { env } = t.context;
  const parent_path = 'parent_dir';
  const child_path = 'parent_dir/child_dir';
  
  await env.smart_directories.create_or_update({ path: parent_path });
  await env.smart_directories.create_or_update({ path: child_path });
  
  const parent = env.smart_directories.get(`SmartDirectory:${parent_path}`);
  await parent.remove();
  
  t.falsy(await env.fs.exists(parent_path));
  t.falsy(await env.fs.exists(child_path));
});

test('Create directory with same name as existing file', async t => {
  const { env } = t.context;
  const file_path = 'existing_file.txt';
  
  await env.fs.write(file_path, 'Some content');
  
  await t.throwsAsync(async () => {
    await env.smart_directories.create_or_update({ path: file_path });
  }, { message: /already exists/ });
});