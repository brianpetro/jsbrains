import test from 'ava';
import { SmartSources } from '../smart_sources.js';

/**
 * Creates a SmartSources instance with provided settings.
 * @param {Object} settings
 * @returns {SmartSources}
 */
function create_sources(settings = {}) {
  const env = {
    env_data_dir: '.smart-env',
    settings: { smart_sources: settings },
    create_env_getter(target) { Object.defineProperty(target, 'env', { value: env }); }
  };
  return new SmartSources(env);
}

test('excluded_patterns combines file and folder exclusions with env_data_dir', t => {
  const sources = create_sources({
    file_exclusions: 'foo.md',
    folder_exclusions: 'bar'
  });
  const patterns = sources.excluded_patterns;
  t.deepEqual(
    patterns.sort(),
    ['foo.md**', 'bar/**', '.smart-env/**'].sort()
  );
});
