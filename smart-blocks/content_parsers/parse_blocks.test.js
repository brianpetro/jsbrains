import test from 'ava';
import { parse_blocks } from './parse_blocks.js';

class StubBlock {
  constructor(env, data) {
    this.env = env;
    this.data = data;
    this.key = data.key;
    this.lines = data.lines;
    this.size = data.size;
    this.vec = data.vec;
  }
  queue_embed() {
    this._queue_embed = true;
  }
}

const create_source = (cache_items = {}) => {
  const block_collection = {
    items: {},
    item_type: StubBlock,
    get(key) { return this.items[key]; },
    set(item) { this.items[item.key] = item; },
    get_many(keys) { return keys.map(key => this.items[key]).filter(Boolean); },
  };
  const source = {
    key: 'Path/Note.md',
    data: {},
    env: { bases_caches: { items: cache_items } },
    block_collection,
    queue_save() { this.saved = true; },
    get blocks() { return Object.values(this.block_collection.items); },
  };
  return { source, block_collection };
};

test('uses bases cache links for blocks containing embedded bases', t => {
  const cache_items = {
    'Path/Note.md#table.base#view': { markdown_table: '[[FromBase]]' },
  };
  const { source, block_collection } = create_source(cache_items);
  const content = [
    'Intro',
    '![[table.base#view]]',
    '',
    '# Second',
    'Plain text',
  ].join('\n');

  parse_blocks(source, content);

  const base_block = block_collection.items['Path/Note.md#'];
  const second_block = block_collection.items['Path/Note.md#Second'];

  t.truthy(base_block);
  t.truthy(second_block);
  t.true(base_block.data.outlinks.some(l => l.target === 'FromBase'));
  t.false((second_block.data.outlinks || []).some(l => l.target === 'FromBase'));
});
