import test from 'ava';
import { SmartEnv } from './smart_env.js';

const comma_file_path = 'Cases/Lastname, Firstname/Doe v. X, 193 S.W.3d 727, 727 (Tex. App. 2006).md';

function create_env_with_saved_settings(saved_settings, auto_excluded_files = []) {
  const env = Object.create(SmartEnv.prototype);

  Object.defineProperty(env, 'config', {
    value: {
      default_settings: {
        smart_sources: {
          file_exclusions: 'Untitled',
          folder_exclusions: '',
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

test('load_settings repairs short-lived array values without persisting runtime exclusions', async (t) => {
  const auto_excluded_path = 'Generated, overlong source.md';
  const env = create_env_with_saved_settings({
    smart_sources: {
      file_exclusions: [comma_file_path, 'safe.md', '/', '**'],
      folder_exclusions: ['Cases/Lastname, Firstname/**', 'SafeFolder/**', '/**'],
    },
  }, [auto_excluded_path]);

  const settings = await env.load_settings();

  t.is(settings.smart_sources.file_exclusions, 'safe.md');
  t.deepEqual(settings.smart_sources.file_exclusions_list, [comma_file_path, 'safe.md']);
  t.is(settings.smart_sources.folder_exclusions, 'SafeFolder/**');
  t.deepEqual(settings.smart_sources.folder_exclusions_list, [
    'Cases/Lastname, Firstname/**',
    'SafeFolder/**',
  ]);
  t.false(settings.smart_sources.file_exclusions_list.includes(auto_excluded_path));
});

test('load_settings leaves legacy CSV exclusions parseable for older clients', async (t) => {
  const env = create_env_with_saved_settings({
    smart_sources: {
      file_exclusions: 'alpha, beta, /, **',
      folder_exclusions: 'Folder, Archive/**, /**',
    },
  });

  const settings = await env.load_settings();

  t.is(settings.smart_sources.file_exclusions, 'alpha, beta, /, **');
  t.is(settings.smart_sources.folder_exclusions, 'Folder, Archive/**, /**');
  t.false('file_exclusions_list' in settings.smart_sources);
  t.false('folder_exclusions_list' in settings.smart_sources);
});
