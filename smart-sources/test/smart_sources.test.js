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
