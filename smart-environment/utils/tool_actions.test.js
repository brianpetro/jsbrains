import test from 'ava';
import {
  get_tool_action_specs,
  run_tool_action,
} from './tool_actions.js';

function create_env(actions = {}) {
  return {
    config: {
      actions,
    },
  };
}

function create_tool_entry(params = {}) {
  return {
    action: params.action || function action(input = {}) {
      return {
        text: input.text,
      };
    },
    display_name: params.display_name || 'Echo',
    display_description: params.display_description || 'Echoes text.',
    input_schema: params.input_schema || {
      type: 'object',
      properties: {
        text: { type: 'string' },
      },
      required: ['text'],
      additionalProperties: false,
    },
    output_schema: params.output_schema,
    action_scope: params.action_scope || {
      type: 'env',
    },
    tool: params.tool || {
      name: 'smart_echo',
    },
  };
}

test('get_tool_action_specs discovers canonical tools and ignores unavailable or provider-shaped tools', (t) => {
  const env = create_env({
    echo: create_tool_entry(),
    unavailable: create_tool_entry({
      tool: {
        name: 'smart_unavailable',
        when() {
          return false;
        },
      },
    }),
    legacy: {
      action() {},
      tool: {
        type: 'function',
        function: {
          name: 'legacy_echo',
        },
      },
    },
  });

  t.deepEqual(
    get_tool_action_specs(env).map((spec) => spec.name),
    ['smart_echo'],
  );
});

test('run_tool_action validates public input before resolving scope', async (t) => {
  let resolved = false;
  const env = create_env();
  env.config.actions.echo = create_tool_entry({
    action_scope: {
      type: 'env',
      resolve() {
        resolved = true;
        return env;
      },
    },
  });

  const error = await t.throwsAsync(
    () => run_tool_action(env, 'smart_echo', {}),
  );

  t.is(
    error.message,
    'Invalid tool input for smart_echo: params.text is required.',
  );
  t.false(resolved);
});

test('run_tool_action resolves item scope and preserves a scoped action override', async (t) => {
  const env = create_env();
  const collection = {
    env,
    get(key) {
      return key === 'alpha' ? item : null;
    },
  };
  const item = {
    env,
    collection,
    actions: {},
  };
  item.actions.echo = function echo({ text, event_source }) {
    return {
      text,
      event_source,
      scoped: this === item,
    };
  }.bind(item);

  env.items = collection;
  env.config.actions.echo = create_tool_entry({
    action_scope: {
      type: 'item',
      collection_key: 'items',
      item_arg: 'key',
    },
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['key', 'text'],
      additionalProperties: false,
    },
    output_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        event_source: { type: 'string' },
        scoped: { type: 'boolean' },
      },
      required: ['text', 'event_source', 'scoped'],
      additionalProperties: false,
    },
  });

  t.deepEqual(
    await run_tool_action(
      env,
      'smart_echo',
      {
        key: 'alpha',
        text: 'hello',
      },
      {
        event_source: 'cli:smart:echo',
      },
    ),
    {
      text: 'hello',
      event_source: 'cli:smart:echo',
      scoped: true,
    },
  );
});

test('get_tool_action_specs rejects duplicate public tool names', (t) => {
  const env = create_env({
    first: create_tool_entry(),
    second: create_tool_entry(),
  });

  t.throws(
    () => get_tool_action_specs(env),
    { message: 'Duplicate tool name: smart_echo' },
  );
});

test('run_tool_action rejects unavailable scope and non-serializable output', async (t) => {
  const env = create_env({
    missing: create_tool_entry({
      tool: { name: 'smart_missing' },
      action_scope: {
        type: 'collection',
        collection_key: 'missing_collection',
      },
    }),
    invalid_output: create_tool_entry({
      tool: { name: 'smart_invalid_output' },
      action() {
        return { fn() {} };
      },
      input_schema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    }),
  });

  await t.throwsAsync(
    () => run_tool_action(env, 'smart_missing', { text: 'hello' }),
    { message: 'Tool scope unavailable: smart_missing' },
  );

  const error = await t.throwsAsync(
    () => run_tool_action(env, 'smart_invalid_output', {}),
  );
  t.true(error.message.startsWith('Tool result is not JSON-serializable'));
});
