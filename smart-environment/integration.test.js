/**
 * @file integration.test.js
 * @description Integration-level (and some unit-level) tests for SmartEnv.
 */

import test from 'ava';
import { SmartEnv } from './smart_env.js';
import { SmartFs } from '../smart-fs/smart_fs.js';
import { NodeFsSmartFsAdapter } from '../smart-fs/adapters/node_fs.js';
import { Collection } from '../smart-collections/collection.js';
import { CollectionItem } from '../smart-collections/item.js';
import ajson_multi_file from '../smart-collections/adapters/ajson_multi_file.js';

/**
 * Simple mock classes for verifying environment merges.
 */
class DummyCollection extends Collection {}
class DummyCollectionItem extends CollectionItem {}

class TestCollection extends Collection {}
class TestCollectionItem extends CollectionItem {}

/**
 * Minimal test class #1 with a config referencing `dummy_collection` and module `smart_fs`.
 *
 * NOTE the explicit `global_ref: global` so Node tests reuse the instance
 */
class TheMain {
  constructor(name = 'TheMain') {
    this.name = name;
    this.smart_env_config = {
      // <-- Add this so Ava + Node environment share the same "singleton"
      global_ref: global,

      env_path: './test/vault',
      collections: {
        dummy_collection: {
          class: DummyCollection,
          data_adapter: ajson_multi_file,
        },
      },
      item_types: {
        DummyCollectionItem,
      },
      modules: {
        smart_fs: {
          class: SmartFs,
          adapter: NodeFsSmartFsAdapter,
        },
      },
    };
  }
}

/**
 * Minimal test class #2 with a config referencing `test_collection` and the same `smart_fs`.
 *
 * Again note the explicit `global_ref: global`.
 */
class DiffMain {
  constructor(name = 'DiffMain') {
    this.name = name;
  }
  get smart_env_config() {
    return {
      global_ref: global, // <-- ensures we reuse the same global ref

      env_path: './test/vault',
      collections: {
        test_collection: {
          class: TestCollection,
          data_adapter: ajson_multi_file,
        },
      },
      item_types: {
        TestCollectionItem,
      },
      modules: {
        smart_fs: {
          class: SmartFs,
          adapter: NodeFsSmartFsAdapter,
        },
      },
    };
  }
}

/**
 * Utility: clears any existing global SmartEnv references for a fresh environment.
 */
function clear_global_smart_env() {
  if (typeof global !== 'undefined' && global.smart_env) {
    delete global.smart_env;
  }
  if (typeof window !== 'undefined' && window.smart_env) {
    delete window.smart_env;
  }
}

/**
 * ==================================================================
 * UNIT TESTS: static create()
 * ==================================================================
 */
test('SmartEnv.create() - throws if invalid main object provided', async (t) => {
  clear_global_smart_env();
  const error = await t.throwsAsync(() => SmartEnv.create(null, {}), {
    instanceOf: TypeError,
  });
  t.true(
    error.message.includes('Invalid main object'),
    'Should throw TypeError with "Invalid main object" in message.'
  );
});

test('SmartEnv.create() - creates a new instance if none is in the global reference', async (t) => {
  clear_global_smart_env();

  const the_main = new TheMain();
  const env = await SmartEnv.create(the_main, the_main.smart_env_config);

  t.truthy(env, 'Should create a new SmartEnv instance if none is in the global ref.');
  t.is(env.opts.env_path, './test/vault', 'env_path should match the config.');
  t.is(the_main.env, env, 'FakeMain instance "env" property should reference the newly created SmartEnv instance.');
  t.is(env.global_ref, global, 'Global ref should be set to Node global.');
  t.is(env.mains.length, 1, 'Should have exactly one main in the environment.');
  t.is(env.mains[0], 'the_main', 'Main key should be snake_case of constructor name.');
  t.truthy(env.dummy_collection, 'dummy_collection is loaded onto the environment.');
});

test('SmartEnv.create() - merges options into existing environment (no re-creation)', async (t) => {
  clear_global_smart_env();

  // Create first main
  const main_a = new TheMain();
  const env_a = await SmartEnv.create(main_a, main_a.smart_env_config);

  t.is(env_a.mains.length, 1, 'Initially only one main after first creation.');
  t.truthy(env_a.dummy_collection, 'dummy_collection from main_a should exist.');
  t.falsy(env_a.test_collection, 'test_collection should not exist yet (not in main_a config).');

  // Create second main with different config
  const main_b = new DiffMain();
  const env_b = await SmartEnv.create(main_b, main_b.smart_env_config);

  // t.is(
  //   env_a,
  //   env_b,
  //   'Should not create a new instance; merges config into the existing environment.'
  // );
  t.is(env_a.mains.length, 2, 'Now the environment should have two mains.');
  t.is(env_a.mains[0], 'the_main', 'First main is the_main.');
  t.is(env_a.mains[1], 'diff_main', 'Second main is diff_main.');

  // Confirm new collection merges
  t.truthy(env_a.dummy_collection, 'dummy_collection remains from the first main.');
  t.truthy(env_a.test_collection, 'test_collection is merged from the second main.');
});

test('SmartEnv init_main() - adds a new main and merges its config', async (t) => {
  clear_global_smart_env();
  const env = new SmartEnv({ modules: {}, collections: {} });
  const the_main = new TheMain();
  const main_key = env.init_main(the_main, the_main.smart_env_config);
  await env.load_main(main_key);

  t.is(main_key, 'the_main', 'init_main should return the snake_case key.');
  t.deepEqual(env.mains, ['the_main'], 'mains array should contain the new main key.');
  t.truthy(env.the_main, 'env should store a reference to the main object by key.');
  t.is(env.opts.env_path, './test/vault', 'env_path merges from main’s config.');
  t.truthy(env.dummy_collection, 'dummy_collection should be merged onto the environment.');
});

test('SmartEnv unload_main() - ensures environment cleanup', async (t) => {
  clear_global_smart_env();

  // Create an environment with 2 mains
  const env = new SmartEnv({ modules: {}, collections: {} });
  const main_one = new TheMain();
  env.init_main(main_one, main_one.smart_env_config);
  await env.load_main('the_main');
  const main_two = new DiffMain();
  env.init_main(main_two, main_two.smart_env_config);
  await env.load_main('diff_main');

  t.is(env.mains.length, 2, 'Should have 2 mains in the environment before unload.');
  t.truthy(env.dummy_collection, 'dummy_collection from main_one exists.');
  t.truthy(env.test_collection, 'test_collection from main_two exists.');

  // Unload main_two
  env.unload_main('diff_main');
  t.is(env.mains.length, 1, 'Should remove main_two from environment’s mains.');
  t.is(env.diff_main, null, 'Property for main_two should be nulled out.');
  t.truthy(env.dummy_collection, 'dummy_collection remains because main_one is still present.');
  // t.true(env.test_collection?.unloaded, 'test_collection should be marked as unloaded.');

  // Finally unload main_one
  env.unload_main('the_main');
  t.is(env.mains.length, 0, 'No mains remain after unloading the last one.');
  t.is(env.the_main, null, 'main_one property should be cleared.');
  // t.true(env.dummy_collection?.unloaded, 'dummy_collection also unloaded.');
});

/**
 * ==================================================================
 * INTEGRATION TESTS
 * ==================================================================
 */

test('SmartEnv.create() - creates a new instance if none is in the global reference (integration)', async (t) => {
  clear_global_smart_env();

  const main = new TheMain();
  const env = await SmartEnv.create(main, main.smart_env_config);

  t.truthy(env, 'Should create a new SmartEnv instance if none is in global ref.');
  t.is(env.opts.env_path, './test/vault', 'env_path matches the config.');
  t.is(main.env, env, 'FakeMain env property references the SmartEnv.');
  t.is(env.global_ref, global, 'Global ref should be Node global.');
  t.is(env.mains.length, 1, 'Exactly one main in the environment.');
  t.is(env.mains[0], 'the_main', 'Key is snake_case of constructor name.');
  t.truthy(env.dummy_collection, 'dummy_collection is loaded.');
});

test('SmartEnv.create() - merges options into the existing environment (integration)', async (t) => {
  clear_global_smart_env();
  const main_a = new TheMain();
  const env_a = await SmartEnv.create(main_a, main_a.smart_env_config);

  t.is(env_a.mains.length, 1, 'One main after first creation.');
  t.truthy(env_a.dummy_collection, 'dummy_collection from main_a exists.');
  t.falsy(env_a.test_collection, 'test_collection not yet loaded.');

  const main_b = new DiffMain();
  const env_b = await SmartEnv.create(main_b, main_b.smart_env_config);

  // t.is(env_a, env_b, 'No re-creation: same environment instance.');
  t.is(env_a.mains.length, 2, 'Now 2 mains in the environment.');
  t.truthy(env_a.dummy_collection, 'dummy_collection remains from main_a.');
  t.truthy(env_a.test_collection, 'test_collection added from main_b.');
});

test('SmartEnv add_main & unload_main - ensures proper cleanup (integration)', async (t) => {
  clear_global_smart_env();

  // 1) Create initial main
  const main_one = new TheMain();
  const env = await SmartEnv.create(main_one, main_one.smart_env_config);

  t.is(env.mains.length, 1, 'One main in env after creation.');
  t.truthy(env.dummy_collection, 'Env has dummy_collection from main_one config.');

  // 2) Add second main
  const main_two = new DiffMain();
  await SmartEnv.create(main_two, main_two.smart_env_config); // merges existing
  t.is(env.mains.length, 2, 'Now two mains present.');
  t.truthy(env.test_collection, 'test_collection from main_two config.');
  t.falsy(env.test_collection.unloaded, 'test_collection not unloaded yet.');
  t.falsy(env.dummy_collection.unloaded, 'dummy_collection also not unloaded yet.');

  // 3) Unload the second main
  env.unload_main('main_two');
  t.is(env.mains.length, 1, 'Removes main_two from .mains.');
  t.is(env['main_two'], null, 'main_two property is nulled on env.');
  t.true(env.test_collection.unloaded, 'test_collection unload() called for main_two.');
  t.falsy(env.dummy_collection.unloaded, 'dummy_collection belongs to main_one; stays loaded.');

  // 4) Unload the first main
  env.unload_main('main_one');
  t.is(env.mains.length, 0, 'No mains remain after unloading the last main.');
  t.is(env['main_one'], null, 'main_one property is cleared on env.');
  t.is(env.global_ref, null, 'Global ref should be cleared when no mains exist.');
  t.true(env.dummy_collection.unloaded, 'dummy_collection unload called when main_one is unloaded.');
});
