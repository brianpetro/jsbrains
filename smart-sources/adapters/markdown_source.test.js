import test from 'ava';
import { MarkdownSourceContentAdapter } from './markdown_source.js';

const create_adapter = () => new MarkdownSourceContentAdapter({
  data: {},
  env: { settings: { smart_sources: {} } },
  collection: { fs: {} },
  file: { stat: {} },
});

test('get_metadata merges frontmatter and inline tags', async t => {
  const adapter = create_adapter();
  const content = `---\ntags: [front]\n---\nbody with #inline`;
  const metadata = await adapter.get_metadata(content);
  t.deepEqual(metadata.tags.sort(), ['#front', '#inline']);
});
