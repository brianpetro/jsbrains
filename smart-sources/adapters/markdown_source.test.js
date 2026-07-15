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

test('get_links keeps the literal embedded Bases link', async t => {
  const adapter = create_adapter();
  const links = await adapter.get_links('![[table.base#Current]]');

  t.is(links.length, 1);
  t.is(links[0].target, 'table.base#Current');
  t.true(links[0].embedded);
});

test('init queues Markdown sources missing the current outlink version', async t => {
  const stale_source = {
    file_type: 'md',
    data: {},
    queue_import() { this.import_queued = true; },
  };
  const current_source = {
    file_type: 'md',
    data: { outlinks_version: 2 },
    queue_import() { this.import_queued = true; },
  };
  const collection = {
    fs_items_initialized: Date.now(),
    items: { stale_source, current_source },
  };

  await MarkdownSourceContentAdapter.init_items(collection);

  t.true(stale_source.import_queued);
  t.falsy(current_source.import_queued);
});

test('import rebuilds unchanged source outlinks when the migration version is missing', async t => {
  const content = '[[Current.md]]';
  const item = {
    data: {
      blocks: { '#': [1, 1] },
      outlinks: [{ target: 'STALE-CACHED-ROW.md' }],
      last_read: { hash: 'old', at: 1 },
      last_import: {
        hash: 'old',
        at: 2,
        mtime: 10,
        size: content.length,
      },
    },
    env: { settings: { smart_sources: {} } },
    collection: {
      fs: { read: async () => content },
    },
    file_path: 'Path/Note.md',
    file: { stat: { mtime: 10, size: content.length } },
    mtime: 10,
    size: content.length,
    vec: [1],
    blocks: [],
    block_collection: { get: () => ({ lines: [1, 1] }) },
    async parse_content() { this.block_parse_called = true; },
    queue_save() { this.save_queued = true; },
    queue_embed() { this.embed_queued = true; },
    should_embed: false,
  };
  const adapter = new MarkdownSourceContentAdapter(item);

  await adapter.import();

  t.deepEqual(item.data.outlinks.map(link => link.target), ['Current.md']);
  t.is(item.data.outlinks_version, 2);
  t.true(item.block_parse_called);
  t.true(item.save_queued);
});

test('empty Markdown completes the outlink migration and removes stale blocks', async t => {
  const stale_block = {
    key: 'Path/Empty.md#',
    data: {
      lines: [1, 1],
      outlinks: [{ target: 'STALE-CACHED-ROW.md' }],
    },
    get lines() { return this.data.lines; },
    queue_save() { this.save_queued = true; },
  };
  const item = {
    data: {
      blocks: { '#': [1, 1] },
      outlinks: [{ target: 'STALE-CACHED-ROW.md' }],
      last_read: { hash: 'old', at: 1 },
      last_import: {
        hash: 'old',
        at: 2,
        mtime: 10,
        size: 1,
      },
    },
    env: { settings: { smart_sources: {} } },
    collection: {
      fs: { read: async () => '' },
    },
    file_path: 'Path/Empty.md',
    file: { stat: { mtime: 10, size: 0 } },
    mtime: 10,
    size: 0,
    vec: [1],
    block_collection: {
      get: () => stale_block,
    },
    get blocks() {
      return this.data.blocks ? [stale_block] : [];
    },
    async parse_content(content) {
      t.is(content, '');
      this.blocks.forEach(block => {
        block.deleted = true;
        block.queue_save();
      });
      this.data.blocks = {};
    },
    queue_save() { this.save_queued = true; },
    queue_embed() { this.embed_queued = true; },
    should_embed: false,
  };
  const adapter = new MarkdownSourceContentAdapter(item);

  await adapter.import();

  t.deepEqual(item.data.outlinks, []);
  t.deepEqual(item.data.metadata, {});
  t.deepEqual(item.data.blocks, {});
  t.is(item.data.outlinks_version, 2);
  t.true(stale_block.deleted);
  t.true(stale_block.save_queued);
  t.true(item.save_queued);
});
