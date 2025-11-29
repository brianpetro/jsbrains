import test from 'ava';
import { SmartSources } from '../smart_sources.js';

/**
 * Creates a SmartSources instance with provided settings.
 * @param {Object} settings
 * @returns {SmartSources}
 */
function create_sources(settings = {}) {
  const env = {
    settings: { smart_sources: settings },
    create_env_getter(target) { Object.defineProperty(target, 'env', { value: env }); }
  };
  return new SmartSources(env);
}

test('file_exclusions reads from nested smart_sources settings', t => {
  const sources = create_sources({ file_exclusions: 'a.md, b.md' });
  t.deepEqual(sources.file_exclusions, ['a.md', 'b.md']);
});

test('folder_exclusions ensures trailing slash and trimming', t => {
  const sources = create_sources({ folder_exclusions: 'folder, nested/' });
  t.deepEqual(sources.folder_exclusions, ['folder/', 'nested/']);
});

test('excluded_headings parses CSV into array', t => {
  const sources = create_sources({ excluded_headings: 'Secret, Draft' });
  t.deepEqual(sources.excluded_headings, ['Secret', 'Draft']);
});
