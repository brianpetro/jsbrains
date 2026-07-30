import test from 'ava';
import { SmartSources } from '../smart_sources.js';

test('run_re_import rebuilds links and flushes source and block saves without embeddings', async t => {
  const calls = [];
  const source = {
    key: 'Notes/Changed.md',
    should_embed: false,
    blocks: [],
    async import() { calls.push('import'); },
  };
  const collection = {
    sources_re_import_queue: {
      [source.key]: { source },
    },
    sources_re_import_timeout: null,
    sources_re_import_halted: false,
    block_collection: {
      settings: { embed_blocks: true },
      async process_save_queue() { calls.push('blocks:save'); },
    },
    set_import_progress_state() {},
    emit_event() {},
    build_links_map() { calls.push('links:build'); },
    async process_save_queue() { calls.push('sources:save'); },
  };

  await SmartSources.prototype.run_re_import.call(collection);

  t.deepEqual(calls, [
    'import',
    'links:build',
    'sources:save',
    'blocks:save',
  ]);
  t.deepEqual(collection.sources_re_import_queue, {});
});

test('run_re_import excludes deselected blocks with stale queue flags', async t => {
  const parent = {
    key: 'Notes/Changed.md#Parent',
    _queue_embed: true,
    should_embed: false,
    is_unembedded: true,
  };
  const child = {
    key: 'Notes/Changed.md#Parent#{1}',
    _queue_embed: false,
    should_embed: true,
    is_unembedded: true,
  };
  const source = {
    key: 'Notes/Changed.md',
    should_embed: false,
    blocks: [parent, child],
    async import() {},
  };
  const embedded_keys = [];
  const collection = {
    sources_re_import_queue: {
      [source.key]: { source },
    },
    sources_re_import_timeout: null,
    sources_re_import_halted: false,
    block_collection: {
      settings: { embed_blocks: true },
      async process_save_queue() {},
    },
    set_import_progress_state() {},
    emit_event() {},
    build_links_map() {},
    async process_save_queue() {},
    async process_embed_queue() {
      embedded_keys.push(...this._embed_queue.map((item) => item.key));
    },
  };

  await SmartSources.prototype.run_re_import.call(collection);

  t.deepEqual(embedded_keys, [child.key]);
  t.false(parent._queue_embed);
  t.true(child._queue_embed);
});

test('run_re_import processes only its targeted queue when the cached queue is dirty', async t => {
  const source = {
    key: 'Notes/Changed.md',
    should_embed: true,
    blocks: [{
      key: 'Notes/Changed.md#Block',
      _queue_embed: true,
      should_embed: true,
      is_unembedded: true,
    }],
    async import() {
      collection._embed_queue = [];
      collection._embed_queue_ready = false;
    },
  };
  const embedded_keys = [];
  let global_queue_rebuilds = 0;
  const collection = {
    sources_re_import_queue: {
      [source.key]: { source },
    },
    sources_re_import_timeout: null,
    sources_re_import_halted: false,
    _embed_queue: [],
    _embed_queue_ready: false,
    block_collection: {
      settings: { embed_blocks: true },
      async process_save_queue() {},
    },
    set_import_progress_state() {},
    emit_event() {},
    build_links_map() {},
    async process_save_queue() {},
    async process_embed_queue() {
      embedded_keys.push(...this.embed_queue.map((item) => item.key));
    },
    mark_embed_queue_dirty() {
      this._embed_queue = [];
      this._embed_queue_ready = false;
    },
  };
  Object.defineProperty(collection, 'embed_queue', {
    get() {
      if (this._embed_queue_ready) return this._embed_queue || [];
      global_queue_rebuilds += 1;
      return [{ key: 'Notes/Unrelated.md' }];
    },
  });

  await SmartSources.prototype.run_re_import.call(collection);

  t.is(global_queue_rebuilds, 0);
  t.deepEqual(embedded_keys, [
    'Notes/Changed.md',
    'Notes/Changed.md#Block',
  ]);
  t.false(collection._embed_queue_ready);
});

