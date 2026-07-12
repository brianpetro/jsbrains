import test from 'ava';
import { SmartEnv } from './smart_env.js';

const comma_file_path = 'Cases/Lastname, Firstname/Doe v. X, 193 S.W.3d 727, 727 (Tex. App. 2006).md';

function create_env_with_saved_settings(saved_settings, auto_excluded_files = []) {
  const env = Object.create(SmartEnv.prototype);

  Object.defineProperty(env, 'config', {
    value: {
      default_settings: {
        smart_sources: {
          file_exclusions: ['Untitled'],
          folder_exclusions: [],
        },
      },
    },
  });
  Object.defineProperty(env, 'data_fs', {
    value: {
      async exists(path) {
        return path === 'smart_env.json';
      },
      async read() {
        return JSON.stringify(saved_settings);
      },
    },
  });
  Object.defineProperty(env, 'fs', {
    value: { auto_excluded_files },
  });

  return env;
}

test('load_settings preserves comma paths and ignores runtime exclusions', async (t) => {
  const auto_excluded_path = 'Generated, overlong source.md';
  const env = create_env_with_saved_settings({
    smart_sources: {
      file_exclusions: [comma_file_path, '/', '**'],
      folder_exclusions: ['Cases/Lastname, Firstname/**', '/**'],
    },
  }, [auto_excluded_path]);

  const settings = await env.load_settings();

  t.deepEqual(settings.smart_sources.file_exclusions, [comma_file_path]);
  t.deepEqual(settings.smart_sources.folder_exclusions, ['Cases/Lastname, Firstname/**']);
  t.false(settings.smart_sources.file_exclusions.includes(auto_excluded_path));
});

test('load_settings migrates safe legacy CSV exclusions to arrays', async (t) => {
  const env = create_env_with_saved_settings({
    smart_sources: {
      file_exclusions: 'alpha, beta, /, **',
      folder_exclusions: 'Folder, Archive/**, /**',
    },
  });

  const settings = await env.load_settings();

  t.deepEqual(settings.smart_sources.file_exclusions, ['alpha', 'beta']);
  t.deepEqual(settings.smart_sources.folder_exclusions, ['Folder', 'Archive/**']);
});
