import test from 'ava';
import { block_get_embed_input_markdown } from './markdown.js';

test('block_get_embed_input_markdown preserves the v2 embedding output', async t => {
  const block = {
    _embed_input: '',
    breadcrumbs: 'Folder > Note',
    async read() {
      return 'Block content';
    },
  };

  const result = await block_get_embed_input_markdown.call(block);

  t.is(result, 'Folder > Note\nBlock content');
  t.is(block._embed_input, result);
});

test('block_get_embed_input_markdown preserves v2 empty-content read behavior', async t => {
  let read_count = 0;
  const block = {
    _embed_input: '',
    breadcrumbs: 'Folder > Note',
    async read() {
      read_count += 1;
      return 'Read content';
    },
  };

  const result = await block_get_embed_input_markdown.call(block, { content: '' });

  t.is(result, 'Folder > Note\nRead content');
  t.is(read_count, 1);
});
