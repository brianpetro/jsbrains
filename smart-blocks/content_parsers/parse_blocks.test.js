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
  stage_embed_content(content, hash) {
    this._staged_embed_content = content;
    this._staged_embed_content_hash = hash;
  }
  clear_staged_embed_content() {
    this._staged_embed_content = null;
    this._staged_embed_content_hash = null;
  }
  get read_hash() {
    return this.data.last_read?.hash;
  }
  get embed_hash() {
    return this.data.last_embed?.hash;
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
    replace_blocks(blocks) { this.data.blocks = blocks; },
  };
  return { source, block_collection };
};

test('does not persist duplicate outlinks on Markdown blocks', t => {
  const { source, block_collection } = create_source();
  const content = [
    'Intro',
    '![[table.base#view]]',
    '',
    '# Second',
    '[[Current.md]]',
  ].join('\n');

  parse_blocks(source, content);

  const base_block = block_collection.items['Path/Note.md#'];
  const second_block = block_collection.items['Path/Note.md#Second'];

  t.truthy(base_block);
  t.truthy(second_block);
  t.false(Object.prototype.hasOwnProperty.call(base_block.data, 'outlinks'));
  t.false(Object.prototype.hasOwnProperty.call(base_block.data, 'outlinks_version'));
  t.false(Object.prototype.hasOwnProperty.call(second_block.data, 'outlinks'));
  t.false(Object.prototype.hasOwnProperty.call(second_block.data, 'outlinks_version'));
});

test('removes deprecated block outlink data without replacing unchanged blocks', t => {
  const { source, block_collection } = create_source();
  const content = '[[Current.md]]';

  parse_blocks(source, content);

  const block = block_collection.items['Path/Note.md#'];
  block.data.outlinks = [{ target: 'STALE-CACHED-ROW.md' }];
  block.data.outlinks_version = 2;
  block._queue_save = false;

  parse_blocks(source, content);

  t.is(block_collection.items['Path/Note.md#'], block);
  t.false(Object.prototype.hasOwnProperty.call(block.data, 'outlinks'));
  t.false(Object.prototype.hasOwnProperty.call(block.data, 'outlinks_version'));
  t.true(block._queue_save);
});

test('stages parsed block content for queued embedding', t => {
  const { source, block_collection } = create_source();
  const content = [
    'Intro',
    '',
    '# Heading',
    'Block content',
  ].join('\n');

  parse_blocks(source, content);

  const heading_block = block_collection.items['Path/Note.md#Heading'];
  t.truthy(heading_block);
  t.true(heading_block._queue_embed);
  t.is(heading_block._staged_embed_content, '# Heading\nBlock content');
  t.is(heading_block._staged_embed_content_hash, heading_block.read_hash);
});
