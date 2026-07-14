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
  queue_save() {
    this._queue_save = true;
  }
  queue_embed() {
    this._queue_embed = true;
  }
}

const create_source = () => {
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
    env: {},
    block_collection,
    queue_save() { this.saved = true; },
    get blocks() { return Object.values(this.block_collection.items); },
  };
  return { source, block_collection };
};

test('keeps the literal Bases link without cached rendered-row links', t => {
  const { source, block_collection } = create_source();
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
  t.true(base_block.data.outlinks.some(link => link.target === 'table.base#view'));
  t.false((base_block.data.outlinks || []).some(link => link.target === 'FromBase'));
  t.false((second_block.data.outlinks || []).some(link => link.target === 'FromBase'));
});

test('rebuilds unchanged block outlinks from content during the outlink migration', t => {
  const { source, block_collection } = create_source();
  const content = '[[Current.md]]';

  parse_blocks(source, content);

  const block = block_collection.items['Path/Note.md#'];
  block.data.outlinks = [{ target: 'STALE-CACHED-ROW.md' }];
  delete block.data.outlinks_version;
  block._queue_save = false;

  parse_blocks(source, content);

  t.deepEqual(block.data.outlinks.map(link => link.target), ['Current.md']);
  t.is(block.data.outlinks_version, 2);
  t.true(block._queue_save);
});
