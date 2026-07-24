import test from 'ava';
import {
  is_action_scope_compatible,
  get_scope_env,
  resolve_action_scope,
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

test('resolve_action_scope resolves canonical environment, collection, and item scopes', (t) => {
  const env = create_env();
  const collection = {
    env,
    get(key) {
      return key === 'item-key'
        ? item
        : null
      ;
    },
  };
  const item = {
    env,
    collection,
  };
  env.smart_items = collection;

  t.is(
    resolve_action_scope(env, 'env_action', {
      action_scope: {
        type: 'env',
      },
    }),
    env,
  );
  t.is(
    resolve_action_scope(env, 'collection_action', {
      action_scope: {
        type: 'collection',
        collection_key: 'smart_items',
      },
    }),
    collection,
  );
  t.is(
    resolve_action_scope(env, 'item_action', {
      action_scope: {
        type: 'item',
        collection_key: 'smart_items',
        item_arg: 'item_key',
      },
    }, {
      item_key: 'item-key',
    }),
    item,
  );
  t.is(
    resolve_action_scope(env, 'missing_item', {
      action_scope: {
        type: 'item',
        collection_key: 'smart_items',
        item_arg: 'item_key',
      },
    }, {
      item_key: 'missing',
    }),
    null,
  );
});

test('resolve_action_scope uses a synchronous custom resolver without changing params', (t) => {
  const env = create_env();
  const params = {
    item_key: 'alias',
  };
  const expected = {
    env,
  };
  const action_entry = {
    action_scope: {
      type: 'item',
      collection_key: 'smart_items',
      item_arg: 'item_key',
      resolve(ctx) {
        t.is(ctx.env, env);
        t.is(ctx.params, params);
        t.is(ctx.action_key, 'custom_action');
        t.is(ctx.action_entry, action_entry);
        return expected;
      },
    },
  };

  t.is(
    resolve_action_scope(
      env,
      'custom_action',
      action_entry,
      params,
    ),
    expected,
  );
  t.deepEqual(params, {
    item_key: 'alias',
  });
});

test('resolve_action_scope defaults an undeclared scope to the environment', (t) => {
  const env = create_env();

  t.is(
    resolve_action_scope(env, 'default_action', {}),
    env,
  );
});

test('is_action_scope_compatible checks exact ownership and declared compatibility', (t) => {
  const env = create_env();
  const collection = {
    env,
  };
  const item = {
    env,
    collection,
  };
  const wrong_collection = {
    env,
  };
  const wrong_item = {
    env,
    collection: wrong_collection,
  };
  const foreign_env = create_env();
  env.smart_items = collection;

  t.true(is_action_scope_compatible(env, undefined, env));
  t.true(is_action_scope_compatible(env, undefined, collection));
  t.true(is_action_scope_compatible(env, {
    type: 'env',
  }, env));
  t.false(is_action_scope_compatible(env, {
    type: 'env',
  }, collection));
  t.true(is_action_scope_compatible(env, {
    type: 'collection',
    collection_key: 'smart_items',
  }, collection));
  t.false(is_action_scope_compatible(env, {
    type: 'collection',
    collection_key: 'smart_items',
  }, wrong_collection));
  t.true(is_action_scope_compatible(env, {
    type: 'item',
    collection_key: 'smart_items',
    item_arg: 'item_key',
  }, item));
  t.false(is_action_scope_compatible(env, {
    type: 'item',
    collection_key: 'smart_items',
    item_arg: 'item_key',
  }, wrong_item));
  t.false(is_action_scope_compatible(env, {
    type: 'item',
    collection_key: 'missing_items',
    item_arg: 'item_key',
  }, {
    env,
  }));
  t.false(is_action_scope_compatible(env, undefined, {
    env: foreign_env,
  }));
  t.false(is_action_scope_compatible(env, undefined, null));
});

test('portable action scope helpers reject invalid declarations', (t) => {
  const env = create_env();

  t.throws(
    () => resolve_action_scope(env, 'invalid', {
      action_scope: {
        type: 'item',
        collection_key: 'smart_items',
      },
    }),
    {
      instanceOf: TypeError,
      message: 'Invalid action_scope item_arg for action: invalid',
    },
  );
  t.throws(
    () => is_action_scope_compatible(env, {
      type: 'unknown',
    }, null),
    {
      instanceOf: TypeError,
      message: 'Invalid action_scope type',
    },
  );
});

test('run_action_entry rejects an invalid action key', (t) => {
  const env = create_env();

  t.throws(
    () => run_action_entry(env, null),
    {
      instanceOf: TypeError,
      message: 'Action key must be a non-empty string.',
    },
  );
  t.throws(
    () => run_action_entry(env, '   '),
    {
      instanceOf: TypeError,
      message: 'Action key must be a non-empty string.',
    },
  );
});

test('run_action_entry rejects invalid params', (t) => {
  const env = create_env({
    test: {
      action() {},
    },
  });

  t.throws(
    () => run_action_entry(env, 'test', []),
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

test('run_action_entry preserves synchronous return values', (t) => {
  const expected = { ok: true };
  const env = create_env({
    test: {
      action() {
        return expected;
      },
    },
  });

  const actual = run_action_entry(env, 'test');

  t.is(actual, expected);
  t.false(actual instanceof Promise);
});

test('run_action_entry preserves action promises without awaiting them', async (t) => {
  const expected = { ok: true };
  const env = create_env({
    test: {
      action() {
        return Promise.resolve(expected);
      },
    },
  });

  const actual = run_action_entry(env, 'test');

  t.true(actual instanceof Promise);
  t.is(await actual, expected);
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

test('run_action_entry reports missing and non-callable actions', (t) => {
  const env = create_env({
    invalid: {
      action: null,
    },
  });

  t.throws(
    () => run_action_entry(env, 'missing'),
    {
      message: 'Action not found: missing',
    },
  );
  t.throws(
    () => run_action_entry(env, 'invalid'),
    {
      message: 'Action is not callable: invalid',
    },
  );
});

test('run_action_entry preserves the original action error', (t) => {
  const expected_error = new Error('Action failed');
  const env = create_env({
    test: {
      action() {
        throw expected_error;
      },
    },
  });

  const actual_error = t.throws(
    () => run_action_entry(env, 'test'),
  );

  t.is(actual_error, expected_error);
});
