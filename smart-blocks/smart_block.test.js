import test from 'ava';
import { create_actions_proxy } from 'smart-collections/utils/create_actions_proxy.js';
import { BlockContentAdapter } from './adapters/_adapter.js';
import { MarkdownBlockContentAdapter } from './adapters/markdown_block.js';
import { block_markdown_get_embed_input } from './actions/get_embed_input/markdown.js';
import smart_block_config, { SmartBlock } from './smart_block.js';

test('read forwards params to the block adapter', async t => {
  const params = { this_file: 'Notes/Current.md' };
  let received_params;
  const block = {
    block_adapter: {
      async read(next_params) {
        received_params = next_params;
        return 'content';
      },
    },
  };

  const content = await SmartBlock.prototype.read.call(block, params);

  t.is(content, 'content');
  t.is(received_params, params);
});

test('block adapter requests source outlinks for the persisted line range', t => {
  let received_lines;
  const item = {
    data: { lines: [2, 4] },
    source: {
      source_adapter: {
        get_outlinks(lines) {
          received_lines = lines;
          return [{ target: 'Scoped.md', line: 3 }];
        },
      },
    },
  };
  const adapter = new BlockContentAdapter(item);

  t.deepEqual(adapter.get_outlinks(), [{ target: 'Scoped.md', line: 3 }]);
  t.deepEqual(received_lines, [2, 4]);
});

test('block adapter returns empty when block lines are missing', t => {
  const adapter = new BlockContentAdapter({ data: {} });

  t.deepEqual(adapter.get_outlinks(), []);
});

test('block outlinks delegate to the active block adapter', t => {
  const expected = [{ target: 'Delegated.md' }];
  const block = {
    block_adapter: {
      get_outlinks() {
        return expected;
      },
    },
  };
  const get_outlinks = Object.getOwnPropertyDescriptor(SmartBlock.prototype, 'outlinks').get;

  t.is(get_outlinks.call(block), expected);
});


test('get_embed_input delegates to the adapter-selected action', async t => {
  const action_key = 'block_markdown_get_embed_input';
  const block_adapter = { embed_input_action_key: action_key };
  const content = 'staged content';
  let received_params;
  const block = {
    key: 'Notes/Example.md#Heading',
    block_adapter,
  };
  block.actions = create_actions_proxy(block, [{
    [action_key]: {
      async action(params) {
        t.is(this, block);
        t.is(this.block_adapter, block_adapter);
        received_params = params;
        return 'embed input';
      },
    },
  }]);

  const result = await SmartBlock.prototype.get_embed_input.call(block, content);

  t.is(result, 'embed input');
  t.deepEqual(received_params, { content });
});

test('get_embed_input rejects a missing adapter action key', async t => {
  const error = await t.throwsAsync(
    SmartBlock.prototype.get_embed_input.call({
      key: 'Notes/Example.md#Heading',
      block_adapter: {},
      actions: {},
    }),
  );

  t.is(
    error.message,
    'SmartBlock.get_embed_input: missing embed_input_action_key for Notes/Example.md#Heading',
  );
});

test('get_embed_input rejects a missing configured action', async t => {
  const error = await t.throwsAsync(
    SmartBlock.prototype.get_embed_input.call({
      key: 'Notes/Example.md#Heading',
      block_adapter: {
        embed_input_action_key: 'block_markdown_get_embed_input',
      },
      actions: {},
    }),
  );

  t.is(
    error.message,
    'SmartBlock.get_embed_input: missing action "block_markdown_get_embed_input" for Notes/Example.md#Heading',
  );
});

test('get_embed_input preserves action errors and intentionally empty output', async t => {
  const action_error = new Error('action failed');
  const block_adapter = {
    embed_input_action_key: 'block_markdown_get_embed_input',
  };
  const failing_block = {
    key: 'Notes/Failing.md#Heading',
    block_adapter,
    actions: {
      async block_markdown_get_embed_input() {
        throw action_error;
      },
    },
  };

  t.is(
    await t.throwsAsync(
      SmartBlock.prototype.get_embed_input.call(failing_block),
    ),
    action_error,
  );

  const empty_block = {
    key: 'Bases/Projects.base#view/Empty',
    block_adapter,
    actions: {
      async block_markdown_get_embed_input() {
        return '';
      },
    },
  };
  t.is(await SmartBlock.prototype.get_embed_input.call(empty_block), '');
});

test('Markdown block adapter key resolves to the registered core action', t => {
  t.is(
    MarkdownBlockContentAdapter.embed_input_action_key,
    'block_markdown_get_embed_input',
  );
  t.is(
    smart_block_config.actions.block_markdown_get_embed_input,
    block_markdown_get_embed_input,
  );
});

test('staged block content is consumed only for the matching read hash', t => {
  const block = {
    _embed_input: 'old input',
    read_hash: 'hash-1',
    clear_staged_embed_content: SmartBlock.prototype.clear_staged_embed_content,
  };

  SmartBlock.prototype.stage_embed_content.call(block, 'Block content', 'hash-1');

  t.is(block._embed_input, '');
  t.is(
    SmartBlock.prototype.consume_staged_embed_content.call(block),
    'Block content',
  );
  t.is(block._staged_embed_content, null);

  SmartBlock.prototype.stage_embed_content.call(block, 'Stale content', 'hash-1');
  block.read_hash = 'hash-2';

  t.is(SmartBlock.prototype.consume_staged_embed_content.call(block), null);
  t.is(block._staged_embed_content, null);
});

test('strict attachment reads reject missing blocks while legacy callers retain their diagnostic', async t => {
  const block = { block_adapter: { read: async () => { throw new Error('BLOCK NOT FOUND: deleted'); } } };
  t.is(await SmartBlock.prototype.read.call(block), 'BLOCK NOT FOUND (run "Prune" to remove)');
  await t.throwsAsync(() => SmartBlock.prototype.read.call(block, { throw_on_error: true }), { message: 'BLOCK NOT FOUND: deleted' });
});

test('strict Markdown block reads preserve scope and propagate source read errors', async t => {
  const options = [];
  const adapter = new MarkdownBlockContentAdapter({
    key: 'Plan.md#Scope', line_start: 2, line_end: 3,
    source: { read: async params => { options.push(params); return 'outside\n# Scope\nselected\nSECRET'; } },
  });
  adapter.update_last_read = () => {};
  t.is(await adapter.read({ throw_on_error: true }), '# Scope\nselected');
  t.deepEqual(options, [{ throw_on_error: true }]);
  adapter.item.source.read = async () => null;
  await t.throwsAsync(() => adapter.read({ throw_on_error: true }), { message: /BLOCK NOT FOUND/ });
  adapter.item.source.read = async () => { throw new Error('Source failed'); };
  await t.throwsAsync(() => adapter.read({ throw_on_error: true }), { message: 'Source failed' });
});
