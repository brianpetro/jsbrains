import test from 'ava';
import {
  get_scope_env,
  run_action_entry,
} from '../index.js';

function create_env(actions = {}) {
  return {
    config: {
      actions,
    },
  };
}

test('get_scope_env returns a Smart Environment scope', (t) => {
  const env = create_env();

  t.is(get_scope_env(env), env);
});

test('get_scope_env resolves collection and item scopes', (t) => {
  const env = create_env();
  const collection = { env };
  const item = { env };

  t.is(get_scope_env(collection), env);
  t.is(get_scope_env(item), env);
});

test('get_scope_env resolves an inherited environment getter', (t) => {
  const env = create_env();
  const scope = Object.create({
    get env() {
      return env;
    },
  });

  t.is(get_scope_env(scope), env);
});

test('get_scope_env rejects invalid scopes without falling back', (t) => {
  t.throws(
    () => get_scope_env(null),
    {
      instanceOf: TypeError,
      message: 'Action scope must be an object.',
    },
  );

  const scope = {
    env: undefined,
    config: {
      actions: {},
    },
  };

  t.throws(
    () => get_scope_env(scope),
    {
      instanceOf: TypeError,
      message:
        'Action scope must be a SmartEnv or expose one through scope.env.',
    },
  );
});

test('run_action_entry rejects an invalid action key', async (t) => {
  const env = create_env();

  await t.throwsAsync(
    run_action_entry(env, null),
    {
      instanceOf: TypeError,
      message: 'Action key must be a non-empty string.',
    },
  );
  await t.throwsAsync(
    run_action_entry(env, '   '),
    {
      instanceOf: TypeError,
      message: 'Action key must be a non-empty string.',
    },
  );
});

test('run_action_entry rejects invalid params', async (t) => {
  const env = create_env({
    test: {
      action() {},
    },
  });

  await t.throwsAsync(
    run_action_entry(env, 'test', []),
    {
      instanceOf: TypeError,
      message: 'Action params must be an object.',
    },
  );
});

test('run_action_entry binds the configured action to the exact scope', async (t) => {
  let action_this;
  let action_params;
  const result = { ok: true };
  const env = create_env({
    test: {
      action(params) {
        action_this = this;
        action_params = params;
        return result;
      },
    },
  });
  const scope = { env };
  const params = {
    value: 1,
    event_source: 'caller',
  };

  const actual_result = await run_action_entry(
    scope,
    'test',
    params,
    {
      event_source: 'adapter',
    },
  );

  t.is(action_this, scope);
  t.deepEqual(action_params, {
    value: 1,
    event_source: 'adapter',
  });
  t.deepEqual(params, {
    value: 1,
    event_source: 'caller',
  });
  t.is(actual_result, result);
});

test('run_action_entry prefers the scoped action proxy', async (t) => {
  let fallback_call_count = 0;
  let scoped_action_this;
  const scoped_result = { source: 'scope.actions' };
  const env = create_env({
    test: {
      action() {
        fallback_call_count += 1;
      },
    },
  });
  const scope = { env };
  scope.actions = {
    test: function test() {
      scoped_action_this = this;
      return scoped_result;
    }.bind(scope),
  };

  const actual_result = await run_action_entry(scope, 'test');

  t.is(fallback_call_count, 0);
  t.is(scoped_action_this, scope);
  t.is(actual_result, scoped_result);
});

test('run_action_entry reports missing and non-callable actions', async (t) => {
  const env = create_env({
    invalid: {
      action: null,
    },
  });

  await t.throwsAsync(
    run_action_entry(env, 'missing'),
    {
      message: 'Action not found: missing',
    },
  );
  await t.throwsAsync(
    run_action_entry(env, 'invalid'),
    {
      message: 'Action is not callable: invalid',
    },
  );
});

test('run_action_entry preserves the original action error', async (t) => {
  const expected_error = new Error('Action failed');
  const env = create_env({
    test: {
      action() {
        throw expected_error;
      },
    },
  });

  const actual_error = await t.throwsAsync(
    run_action_entry(env, 'test'),
  );

  t.is(actual_error, expected_error);
});
