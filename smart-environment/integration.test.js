/**
 * @file integration.test.js
 * @description Integration tests for SmartEnv focusing on:
 *  1. `static create` behavior:
 *     - Creates a new instance if none in global
 *     - Merges options in existing env (using `add_main`)
 *     - Verifies no re-creation (SmartEnv remains singleton)
 *  2. `add_main` and `unload_main` ensuring proper cleanup
 *
 * Usage:
 *   npx ava --verbose test_smart_env.js
 */

import test from 'ava';
import { SmartEnv } from './smart_env.js';
import { SmartFs } from '../smart-fs/smart_fs.js';
/**
 * Minimal test class to simulate a 'Main' object.
 */
class FakeMain {
  constructor(name = 'FakeMain') {
    this.name = name;
    this.smart_env_config = {
      collections: {
        dummy_collection: {
          class: function dummyCollection() {},
        },
      },
      modules: {
        smart_fs: {
          class: SmartFs,
          adapter: function smartFsAdapter() {},
        },
        dummy_module: {
          class: function dummyModule() {},
        },
      },
    };
  }
}

/**
 * Utility: clears the global reference for a fresh test environment.
 */
function clear_global_smart_env() {
  if (typeof global !== 'undefined' && global.smart_env) {
    delete global.smart_env;
  }
  if (typeof window !== 'undefined' && window.smart_env) {
    delete window.smart_env;
  }
}

test('SmartEnv.create() - new instance if none in global', async (t) => {
  clear_global_smart_env();

  const fake_main = new FakeMain('FirstMain');
  const env = await SmartEnv.create(fake_main, {
    env_path: '/test/path',
    global_ref: global, // in Node, or window for browser
    modules: {
      smart_fs: {
        class: SmartFs,
        adapter: function smartFsAdapter() {},
      },
    }, // minimal usage
    collections: {},
  });

  t.truthy(env, 'A new SmartEnv instance should be created.');
  t.deepEqual(env.opts.env_path, '/test/path', 'env_path should match the passed option.');
  t.is(fake_main.env, env, 'FakeMain instance "env" property should reference the same SmartEnv instance.');
  t.is(env.global_ref, global, 'Global ref should be set to global.');
  t.is(env.mains.length, 1, 'There should be exactly one main in the environment.');
  t.is(env.mains[0], 'fake_main', 'The main key should be the snake_case version of the constructor name.');
});

test('SmartEnv.create() - merges opts in existing environment (no re-creation)', async (t) => {
  clear_global_smart_env();

  // First creation
  const main_a = new FakeMain('MainA');
  const env_a = await SmartEnv.create(main_a, {
    env_path: '/initial/path',
    global_ref: global,
    modules: {
      some_module: {
        class: function someModule() {},
      },
    },
    collections: {},
  });

  // Second creation with different opts (should merge, not recreate)
  const main_b = new FakeMain('MainB');
  const env_b = await SmartEnv.create(main_b, {
    env_path: '/new/path/should/merge',
    global_ref: global,
    modules: {
      second_module: {
        class: function secondModule() {},
      },
    },
    collections: {
      new_collection: {
        class: function newCollection() {},
      },
    },
  });

  t.is(env_a, env_b, 'SmartEnv should NOT recreate a new instance; it should merge into the existing instance.');
  t.is(env_a.mains.length, 2, 'The environment should have two mains now.');
  t.is(env_a.mains[0], 'main_a', 'First main should remain in the environment.');
  t.is(env_a.mains[1], 'main_b', 'Second main should be added to the environment.');
  t.true(!!env_a.opts.modules.some_module, 'Some module is retained from the original env opts.');
  t.true(!!env_a.opts.modules.second_module, 'Second module is merged into the existing env opts.');
  t.true(!!env_a.opts.collections.new_collection, 'New collection is merged into the existing env opts.');
  t.is(env_a.opts.env_path, '/new/path/should/merge', 'env_path should be overwritten by the second create call.');
});

test('SmartEnv add_main & unload_main - ensures proper cleanup', async (t) => {
  clear_global_smart_env();

  const env_opts = {
    env_path: '/cleanup/test/path',
    global_ref: global,
    modules: {},
    collections: {
      test_collection: {
        class: function testCollection() {
          // mimic a collection that has an `unload` method
          this.unload = () => {
            this.unloaded = true;
          };
        },
      },
    },
  };

  // Create initial main
  const main_one = new FakeMain('MainOne');
  const env = await SmartEnv.create(main_one, env_opts);
  t.is(env.mains.length, 1, 'Env has one main after initial create.');

  // Add a second main
  const main_two = new FakeMain('MainTwo');
  await SmartEnv.create(main_two, env_opts); // merges, doesn't recreate
  t.is(env.mains.length, 2, 'Env should have two mains after adding second main.');

  // Confirm the collection references
  t.truthy(env.test_collection, 'The test_collection should be created as part of SmartEnv.');
  t.falsy(env.test_collection.unloaded, 'Collection should not be unloaded yet.');

  // Unload the second main
  env.unload_main('main_two');
  t.is(env.mains.length, 1, 'Env should remove main_two from .mains.');
  t.is(env['main_two'], null, 'main_two property should be set to null on env.');
  t.true(env.test_collection.unloaded, 'The test_collection unload should be called if it belonged to main_two config.');

  // Unload the first main
  env.unload_main('main_one');
  t.is(env.mains.length, 0, 'Env should have zero mains after unloading the last main.');
  t.is(env['main_one'], null, 'main_one property should be cleared on env.');
  t.is(env.global_ref, null, 'Global ref should be cleared if no more mains exist.');
});
