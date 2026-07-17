import test from 'ava';
import { create_actions_proxy } from 'smart-collections/utils/create_actions_proxy.js';
import { BlockContentAdapter } from './adapters/_adapter.js';
import { MarkdownBlockContentAdapter } from './adapters/markdown_block.js';
import { block_get_embed_input_markdown } from './actions/get_embed_input/markdown.js';
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
  const action_key = 'block_get_embed_input_markdown';
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
        embed_input_action_key: 'block_get_embed_input_markdown',
      },
      actions: {},
    }),
  );

  t.is(
    error.message,
    'SmartBlock.get_embed_input: missing action "block_get_embed_input_markdown" for Notes/Example.md#Heading',
  );
});

test('get_embed_input preserves action errors and intentionally empty output', async t => {
  const action_error = new Error('action failed');
  const block_adapter = {
    embed_input_action_key: 'block_get_embed_input_markdown',
  };
  const failing_block = {
    key: 'Notes/Failing.md#Heading',
    block_adapter,
    actions: {
      async block_get_embed_input_markdown() {
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
      async block_get_embed_input_markdown() {
        return '';
      },
    },
  };
  t.is(await SmartBlock.prototype.get_embed_input.call(empty_block), '');
});

test('Markdown block adapter key resolves to the registered core action', t => {
  t.is(
    MarkdownBlockContentAdapter.embed_input_action_key,
    'block_get_embed_input_markdown',
  );
  t.is(
    smart_block_config.actions.block_get_embed_input_markdown,
    block_get_embed_input_markdown,
  );
});
