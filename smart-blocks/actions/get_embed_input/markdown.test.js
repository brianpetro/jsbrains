import test from 'ava';
import { block_markdown_get_embed_input } from './markdown.js';

test('block_markdown_get_embed_input preserves the v2 embedding output', async t => {
  const block = {
    _embed_input: '',
    breadcrumbs: 'Folder > Note',
    async read() {
      return 'Block content';
    },
  };

  const result = await block_markdown_get_embed_input.call(block);

  t.is(result, 'Folder > Note\nBlock content');
  t.is(block._embed_input, result);
});

test('block_markdown_get_embed_input preserves v2 empty-content read behavior', async t => {
  let read_count = 0;
  const block = {
    _embed_input: '',
    breadcrumbs: 'Folder > Note',
    async read() {
      read_count += 1;
      return 'Read content';
    },
  };

  const result = await block_markdown_get_embed_input.call(block, { content: '' });

  t.is(result, 'Folder > Note\nRead content');
  t.is(read_count, 1);
});

test('block_markdown_get_embed_input consumes staged content when wrapper content is null', async t => {
  let read_count = 0;
  const block = {
    _embed_input: '',
    _staged_embed_content: 'Staged block',
    _staged_embed_content_hash: 'current-hash',
    read_hash: 'current-hash',
    breadcrumbs: 'Folder > Note',
    consume_staged_embed_content() {
      const content = this._staged_embed_content;
      this._staged_embed_content = null;
      this._staged_embed_content_hash = null;
      return content;
    },
    async read() {
      read_count += 1;
      return 'Read block';
    },
  };

  const result = await block_markdown_get_embed_input.call(block, { content: null });

  t.is(result, 'Folder > Note\nStaged block');
  t.is(read_count, 0);
  t.is(block._staged_embed_content, null);
});

test('block_markdown_get_embed_input refreshes cached input from explicit content', async t => {
  const block = {
    _embed_input: 'Folder > Note\nOld block',
    breadcrumbs: 'Folder > Note',
    clear_staged_embed_content() {
      this.staged_content_cleared = true;
    },
    async read() {
      throw new Error('read should not be called');
    },
  };

  const result = await block_markdown_get_embed_input.call(block, {
    content: 'New block',
  });

  t.is(result, 'Folder > Note\nNew block');
  t.true(block.staged_content_cleared);
});
