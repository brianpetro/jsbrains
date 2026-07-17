import test from 'ava';
import { create_actions_proxy } from 'smart-collections/utils/create_actions_proxy.js';
import { DataContentAdapter } from '../adapters/data_content.js';
import { MarkdownSourceContentAdapter } from '../adapters/markdown_source.js';
import { TextSourceContentAdapter } from '../adapters/text.js';
import { source_get_embed_input_data } from '../actions/get_embed_input/data.js';
import { source_get_embed_input_markdown } from '../actions/get_embed_input/markdown.js';
import { source_get_embed_input_text } from '../actions/get_embed_input/text.js';
import smart_source_config, { SmartSource } from '../smart_source.js';

test('get_embed_input delegates to the adapter-selected action', async t => {
  const action_key = 'source_get_embed_input_markdown';
  const source_adapter = { embed_input_action_key: action_key };
  const content = 'staged content';
  let received_params;
  const source = {
    key: 'Notes/Example.md',
    source_adapter,
  };
  source.actions = create_actions_proxy(source, [{
    [action_key]: {
      async action(params) {
        t.is(this, source);
        t.is(this.source_adapter, source_adapter);
        received_params = params;
        return 'embed input';
      },
    },
  }]);

  const result = await SmartSource.prototype.get_embed_input.call(source, content);

  t.is(result, 'embed input');
  t.deepEqual(received_params, { content });
});

test('get_embed_input rejects a missing adapter action key', async t => {
  const error = await t.throwsAsync(
    SmartSource.prototype.get_embed_input.call({
      key: 'Notes/Example.md',
      source_adapter: {},
      actions: {},
    }),
  );

  t.is(
    error.message,
    'SmartSource.get_embed_input: missing embed_input_action_key for Notes/Example.md',
  );
});

test('get_embed_input rejects a missing configured action', async t => {
  const error = await t.throwsAsync(
    SmartSource.prototype.get_embed_input.call({
      key: 'Notes/Example.md',
      source_adapter: {
        embed_input_action_key: 'source_get_embed_input_markdown',
      },
      actions: {},
    }),
  );

  t.is(
    error.message,
    'SmartSource.get_embed_input: missing action "source_get_embed_input_markdown" for Notes/Example.md',
  );
});

test('get_embed_input preserves action errors and intentionally empty output', async t => {
  const action_error = new Error('action failed');
  const source_adapter = {
    embed_input_action_key: 'source_get_embed_input_markdown',
  };
  const failing_source = {
    key: 'Notes/Failing.md',
    source_adapter,
    actions: {
      async source_get_embed_input_markdown() {
        throw action_error;
      },
    },
  };

  t.is(
    await t.throwsAsync(
      SmartSource.prototype.get_embed_input.call(failing_source),
    ),
    action_error,
  );

  const empty_source = {
    key: 'Bases/Projects.base',
    source_adapter,
    actions: {
      async source_get_embed_input_markdown() {
        return '';
      },
    },
  };
  t.is(await SmartSource.prototype.get_embed_input.call(empty_source), '');
});

test('markdown source action preserves the v2 embedding output', async t => {
  const source = {
    _embed_input: null,
    path: 'Folder/Note.md',
    excluded_lines: [{ start: 1, end: 1 }],
    collection: {
      embed_model: {
        model: {
          data: { max_tokens: 100 },
        },
      },
    },
    async read() {
      return 'keep\nremove\nkeep too';
    },
  };

  const result = await source_get_embed_input_markdown.call(source);

  t.is(result, 'Folder > Note:\nkeep\nkeep too');
  t.is(source._embed_input, result);
});

test('source adapter keys resolve to registered type-specific actions', t => {
  t.is(
    MarkdownSourceContentAdapter.embed_input_action_key,
    'source_get_embed_input_markdown',
  );
  t.is(
    TextSourceContentAdapter.embed_input_action_key,
    'source_get_embed_input_text',
  );
  t.is(
    DataContentAdapter.embed_input_action_key,
    'source_get_embed_input_data',
  );
  t.is(
    smart_source_config.actions.source_get_embed_input_markdown,
    source_get_embed_input_markdown,
  );
  t.is(
    smart_source_config.actions.source_get_embed_input_text,
    source_get_embed_input_text,
  );
  t.is(
    smart_source_config.actions.source_get_embed_input_data,
    source_get_embed_input_data,
  );
});
