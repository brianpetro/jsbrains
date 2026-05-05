import test from 'ava';
import { SmartEnv } from '../smart_env.js';

function create_deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

class OldPlugin {}
class NewPlugin {}

function build_minimal_env_config() {
  return {
    env_start_wait_time: 60000,
    collections: {},
    modules: {},
    items: {},
  };
}

test('newer SmartEnv supersedes older SmartEnv before older load locks global env', async (t) => {
  const global_ref = {};
  const old_run_started = create_deferred();
  const release_old_run = create_deferred();

  class OldSmartEnv extends SmartEnv {
    static version = '2.4.1';
    static global_ref = global_ref;

    constructor(opts = {}) {
      super(opts);
      this.after_load_calls = 0;
    }

    async run_load() {
      old_run_started.resolve();
      await release_old_run.promise;
      return this;
    }

    async after_load() {
      this.after_load_calls += 1;
    }
  }

  class NewSmartEnv extends SmartEnv {
    static version = '2.4.3';
    static global_ref = global_ref;

    constructor(opts = {}) {
      super(opts);
      this.run_load_calls = 0;
      this.after_load_calls = 0;
    }

    async run_load() {
      this.run_load_calls += 1;
      return this;
    }

    async after_load() {
      this.after_load_calls += 1;
    }
  }

  const old_env = await OldSmartEnv.create(new OldPlugin(), build_minimal_env_config());
  clearTimeout(old_env.load_timeout);
  old_env.load_timeout = null;

  const old_load_promise = old_env.load();
  await old_run_started.promise;
  t.is(old_env.state, 'loading');

  const new_env = await NewSmartEnv.create(new NewPlugin(), build_minimal_env_config());
  clearTimeout(new_env.load_timeout);
  new_env.load_timeout = null;

  t.is(old_env.state, 'superceded');
  t.is(global_ref.smart_env, new_env);

  release_old_run.resolve();
  await old_load_promise;

  t.is(old_env.after_load_calls, 0);
  t.is(old_env.state, 'superceded');
  t.is(global_ref.smart_env, new_env);
  t.not(Object.getOwnPropertyDescriptor(global_ref, 'smart_env')?.configurable, false);

  await new_env.load();

  t.is(new_env.run_load_calls, 1);
  t.is(new_env.after_load_calls, 1);
  t.is(new_env.state, 'loaded');
  t.is(global_ref.smart_env, new_env);
  t.is(Object.getOwnPropertyDescriptor(global_ref, 'smart_env')?.configurable, false);
});

test('newer SmartEnv create does not supercede loaded locked global env', async (t) => {
  const global_ref = {};
  let newer_constructor_calls = 0;

  class LoadedSmartEnv extends SmartEnv {
    static version = '2.4.1';
    static global_ref = global_ref;

    async run_load() {
      return this;
    }
  }

  class NewerSmartEnv extends SmartEnv {
    static version = '2.4.3';
    static global_ref = global_ref;

    constructor(opts = {}) {
      super(opts);
      newer_constructor_calls += 1;
    }

    async run_load() {
      t.fail('Newer SmartEnv should not be instantiated or loaded after the global env is locked.');
      return this;
    }
  }

  const loaded_plugin = new OldPlugin();
  const new_plugin = new NewPlugin();
  const loaded_env = await LoadedSmartEnv.create(loaded_plugin, build_minimal_env_config());
  clearTimeout(loaded_env.load_timeout);
  loaded_env.load_timeout = null;
  await loaded_env.load();

  t.is(loaded_env.state, 'loaded');
  t.is(global_ref.smart_env, loaded_env);
  t.is(Object.getOwnPropertyDescriptor(global_ref, 'smart_env')?.configurable, false);

  const result = await NewerSmartEnv.create(new_plugin, build_minimal_env_config());

  t.is(result, loaded_env);
  t.is(global_ref.smart_env, loaded_env);
  t.is(loaded_env.state, 'loaded');
  t.is(loaded_env.load_timeout, null);
  t.is(newer_constructor_calls, 0);
  t.truthy(global_ref.smart_env_configs.new_plugin);
  t.is(loaded_plugin.env, loaded_env);
  t.is(new_plugin.env, loaded_env);
});

