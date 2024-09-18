import test from 'ava';
import { SmartSources } from '../smart_sources.js';
import { SmartSource } from '../smart_source.js';

// Mock environment and dependencies
const env = {
  smart_env_settings: {
    fs: {
      exists: async (path) => true,
      read: async (path) => 'Sample content',
      write: async (path, content) => {},
      stat: async (path) => ({ mtime: Date.now(), size: content.length }),
    },
  },
  smart_blocks: {
    create_or_update: async (block) => block,
    items: {},
  },
};

test('exclusion_settings should exclude specified patterns', async t => {
  const smart_sources = new SmartSources(env);
  
  // Create a SmartSource with exclusion settings
  const source = new SmartSource(env, {
    data: {
      path: 'test.md',
      exclusion_settings: {
        exclude_patterns: ['%exclude%'],
      },
      stat: { mtime: Date.now(), size: 100 },
      blocks: {},
    },
    methods: {},
  });

  // Mock read method to return content with excluded pattern
  source.read = async () => 'This line should be included\n%exclude% This line should be excluded';

  await source.parse_content();

  t.false(source.excluded);
  // Further assertions based on how exclusion is handled in parse_content
});