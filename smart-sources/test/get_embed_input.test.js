import test from 'ava';
import { create_actions_proxy } from 'smart-collections/utils/create_actions_proxy.js';
import { DataContentAdapter } from '../adapters/data_content.js';
import { MarkdownSourceContentAdapter } from '../adapters/markdown_source.js';
import { TextSourceContentAdapter } from '../adapters/text.js';
import { source_data_get_embed_input } from '../actions/get_embed_input/data.js';
import { source_markdown_get_embed_input } from '../actions/get_embed_input/markdown.js';
import { source_text_get_embed_input } from '../actions/get_embed_input/text.js';
import smart_source_config, { SmartSource } from '../smart_source.js';

test('get_embed_input delegates to the adapter-selected action', async t => {
  const action_key = 'source_markdown_get_embed_input';
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
        embed_input_action_key: 'source_markdown_get_embed_input',
      },
      actions: {},
    }),
  );

  t.is(
    error.message,
    'SmartSource.get_embed_input: missing action "source_markdown_get_embed_input" for Notes/Example.md',
  );
});

test('get_embed_input preserves action errors and intentionally empty output', async t => {
  const action_error = new Error('action failed');
  const source_adapter = {
    embed_input_action_key: 'source_markdown_get_embed_input',
  };
  const failing_source = {
    key: 'Notes/Failing.md',
    source_adapter,
    actions: {
      async source_markdown_get_embed_input() {
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
      async source_markdown_get_embed_input() {
        return '';
      },
    },
  };
  t.is(await SmartSource.prototype.get_embed_input.call(empty_source), '');
});

test('text and data source actions delegate through the action registry', async t => {
  for (const action of [source_text_get_embed_input, source_data_get_embed_input]) {
    const params = { content: 'content' };
    let received_params;
    const source = {};
    source.actions = create_actions_proxy(source, [{
      source_markdown_get_embed_input: {
        async action(next_params) {
          t.is(this, source);
          received_params = next_params;
          return 'registry override';
        },
      },
    }]);

    const result = await action.call(source, params);

    t.is(result, 'registry override');
    t.is(received_params, params);
  }
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

  const result = await source_markdown_get_embed_input.call(source);

  t.is(result, 'Folder > Note:\nkeep\nkeep too');
  t.is(source._embed_input, result);
});

test('source adapter keys resolve to registered type-specific actions', t => {
  t.is(
    MarkdownSourceContentAdapter.embed_input_action_key,
    'source_markdown_get_embed_input',
  );
  t.is(
    TextSourceContentAdapter.embed_input_action_key,
    'source_text_get_embed_input',
  );
  t.is(
    DataContentAdapter.embed_input_action_key,
    'source_data_get_embed_input',
  );
  t.is(
    smart_source_config.actions.source_markdown_get_embed_input,
    source_markdown_get_embed_input,
  );
  t.is(
    smart_source_config.actions.source_text_get_embed_input,
    source_text_get_embed_input,
  );
  t.is(
    smart_source_config.actions.source_data_get_embed_input,
    source_data_get_embed_input,
  );
});

test('markdown source action refreshes cached input from supplied content', async t => {
  let read_count = 0;
  const source = {
    _embed_input: 'Folder > Note:\nOld content',
    path: 'Folder/Note.md',
    excluded_lines: [],
    collection: {
      embed_model: {
        model: {
          data: { max_tokens: 100 },
        },
      },
    },
    async read() {
      read_count += 1;
      return 'Read content';
    },
  };

  const result = await source_markdown_get_embed_input.call(source, {
    content: 'New content',
  });

  t.is(result, 'Folder > Note:\nNew content');
  t.is(read_count, 0);
});
