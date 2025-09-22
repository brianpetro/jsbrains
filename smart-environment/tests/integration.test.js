/**
 * @file integration.test.js
 * @description Integration-level (and some unit-level) tests for SmartEnv.
 */

import test from 'ava';
import { SmartEnv } from '../smart_env.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import { NodeFsSmartFsAdapter } from '../../smart-fs/adapters/node_fs.js';
import { Collection } from 'smart-collections/collection.js';
import { CollectionItem } from 'smart-collections/item.js';
import ajson_multi_file from 'smart-collections/adapters/ajson_multi_file.js';
import { SmartEvents } from '../../smart-events/smart_events.js';

import path from 'path';
/**
 * Simple mock classes for verifying environment merges.
 */
class DiffCollection extends Collection {}
class DiffCollectionItem extends CollectionItem {}

class TheCollection extends Collection {}
class TheCollectionItem extends CollectionItem {}

class TheMain {
  get smart_env_config() {
    if(!this._smart_env_config){ // must be cached to allow proper unload_main()
      this._smart_env_config = {
        env_path: path.resolve('./test/vault'),
        collections: {
          the_collection: {
            class: TheCollection,
            data_adapter: ajson_multi_file,
          },
        },
        item_types: {
          TheCollectionItem,
        },
        modules: {
          smart_fs: {
            class: SmartFs,
            adapter: NodeFsSmartFsAdapter,
          },
        },
      }
    }
    return this._smart_env_config;
  }
  constructor(name = 'TheMain') {
    // this.name = name;
  }
}

class DiffMain {
  smart_env_config = {
    env_path: path.resolve('./test/vault'),
    collections: {
      diff_collection: {
        class: DiffCollection,
        data_adapter: ajson_multi_file,
      },
    },
    item_types: {
      DiffCollectionItem,
    },
    modules: {
      smart_fs: {
        class: SmartFs,
        adapter: NodeFsSmartFsAdapter,
      },
    },
  };
  constructor(name = 'DiffMain') {
    // Store config in a real object property
  }
}

/**
 * Utility: clears any existing global SmartEnv references for a fresh environment.
 */
function clear_global_smart_env() {
  const g = SmartEnv.global_ref;
  if (g.smart_env) delete g.smart_env;
  if (g.smart_env_configs) delete g.smart_env_configs;
}

/**
 * ==================================================================
 * UNIT TESTS: static create()
 * ==================================================================
 */
test.serial('SmartEnv.create() - throws if invalid main object provided', async (t) => {
  clear_global_smart_env();
  const error = await t.throwsAsync(() => SmartEnv.create(null, {}), {
    instanceOf: TypeError,
  });
  t.true(
    error.message.includes('Invalid main object'),
    'Should throw TypeError with "Invalid main object" in message.'
  );
});

test.serial('SmartEnv.create() - attaches SmartEvents to env.events', async (t) => {
  clear_global_smart_env();

  const main = new TheMain();
  const env = await SmartEnv.create(main, main.smart_env_config);

  t.truthy(env.events, 'SmartEnv should expose env.events.');
  t.true(env.events instanceof SmartEvents, 'env.events should be a SmartEvents instance.');
  t.is(env.events, env.events, 'env.events getter should return the same instance each time.');
});

test.serial('SmartEnv.create() - creates a new instance if none is in the global reference', async (t) => {
  clear_global_smart_env();

  const the_main = new TheMain();
  const env = await SmartEnv.create(the_main, the_main.smart_env_config);

  t.truthy(env, 'Should create a new SmartEnv instance if none is in the global ref.');
  t.is(env.opts.env_path, path.resolve('./test/vault'), 'env_path should match the config.');
  t.is(the_main.env, env, 'FakeMain instance "env" property should reference the newly created SmartEnv instance.');
  t.is(env.mains.length, 1, 'Should have exactly one main in the environment.');
  t.is(env.mains[0], 'the_main', 'Main key should be snake_case of constructor name.');
  t.truthy(env.the_collection, 'the_collection is loaded onto the environment.');
});

test.serial('SmartEnv.create() - merges options into existing environment (no re-creation)', async (t) => {
  clear_global_smart_env();

  // Create first main
  const main_a = new TheMain();
  const env_a = await SmartEnv.create(main_a, main_a.smart_env_config);

  t.is(env_a.mains.length, 1, 'Initially only one main after first creation.');
  t.truthy(env_a.the_collection, 'the_collection from main_a should exist.');
  t.falsy(env_a.diff_collection, 'diff_collection should not exist yet (not in main_a config).');

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
  t.truthy(env_a.the_collection, 'the_collection remains from the first main.');
  t.truthy(env_a.diff_collection, 'diff_collection is merged from the second main.');
});

test.serial('SmartEnv init_main() - adds a new main and merges its config', async (t) => {
  clear_global_smart_env();
  const env = new SmartEnv({ modules: {}, collections: {} });
  SmartEnv.global_env = env;
  const the_main = new TheMain();
  const main_key = env.init_main(the_main, the_main.smart_env_config);
  await env.load_main(main_key);

  t.is(main_key, 'the_main', 'init_main should return the snake_case key.');
  t.deepEqual(env.mains, ['the_main'], 'mains array should contain the new main key.');
  t.truthy(env.the_main, 'env should store a reference to the main object by key.');
  t.is(env.opts.env_path, path.resolve('./test/vault'), 'env_path merges from main’s config.');
  t.truthy(env.the_collection, 'the_collection should be merged onto the environment.');
});

test.serial('SmartEnv unload_main() - ensures environment cleanup', async (t) => {
  clear_global_smart_env();

  // Create an environment with 2 mains
  const env = new SmartEnv({ modules: {}, collections: {} });
  SmartEnv.global_env = env;
  const main_one = new TheMain();
  env.init_main(main_one, main_one.smart_env_config);
  await env.load_main('the_main');
  const main_two = new DiffMain();
  env.init_main(main_two, main_two.smart_env_config);
  await env.load_main('diff_main');

  t.is(env.mains.length, 2, 'Should have 2 mains in the environment before unload.');
  t.truthy(env.the_collection, 'the_collection from main_one exists.');
  t.truthy(env.diff_collection, 'diff_collection from main_two exists.');

  // Unload main_two
  env.unload_main(main_two);
  t.is(env.mains.length, 1, 'Should remove main_two from environment’s mains.');
  t.is(env.diff_main, null, 'Property for main_two should be nulled out.');
  t.truthy(env.the_collection, 'the_collection remains because main_one is still present.');
  // t.true(env.diff_collection?.unloaded, 'diff_collection should be marked as unloaded.');

  // Finally unload main_one
  env.unload_main(main_one);
  t.is(env.mains.length, 0, 'No mains remain after unloading the last one.');
  t.is(env.the_main, null, 'main_one property should be cleared.');
  // t.true(env.the_collection?.unloaded, 'the_collection also unloaded.');
});

test.serial('SmartEnv.create() - creates a new instance if none is in the global reference (integration)', async (t) => {
  clear_global_smart_env();

  const main = new TheMain();
  const env = await SmartEnv.create(main, main.smart_env_config);

  t.truthy(env, 'Should create a new SmartEnv instance if none is in global ref.');
  t.is(env.opts.env_path, path.resolve('./test/vault'), 'env_path matches the config.');
  t.is(main.env, env, 'FakeMain env property references the SmartEnv.');
  t.is(env.mains.length, 1, 'Exactly one main in the environment.');
  t.is(env.mains[0], 'the_main', 'Key is snake_case of constructor name.');
  t.truthy(env.the_collection, 'the_collection is loaded.');
});

test.serial('SmartEnv.create() - merges options into the existing environment (integration)', async (t) => {
  clear_global_smart_env();
  const main_a = new TheMain();
  const env_a = await SmartEnv.create(main_a, main_a.smart_env_config);

  t.is(env_a.mains.length, 1, 'One main after first creation.');
  t.truthy(env_a.the_collection, 'the_collection from main_a exists.');
  t.falsy(env_a.diff_collection, 'diff_collection not yet loaded.');

  const main_b = new DiffMain();
  const env_b = await SmartEnv.create(main_b, main_b.smart_env_config);

  // t.is(env_a, env_b, 'No re-creation: same environment instance.');
  t.is(env_a.mains.length, 2, 'Now 2 mains in the environment.');
  t.truthy(env_a.the_collection, 'the_collection remains from main_a.');
  t.truthy(env_a.diff_collection, 'diff_collection added from main_b.');
});

test.serial('SmartEnv add_main & unload_main - ensures proper cleanup (integration)', async (t) => {
  clear_global_smart_env();

  // 1) Create initial main
  const main_one = new TheMain();
  const env = await SmartEnv.create(main_one, main_one.smart_env_config);

  t.is(env.mains.length, 1, 'One main in env after creation.');
  t.truthy(env.the_collection, 'Env has the_collection from main_one config.');

  // 2) Add second main
  const main_two = new DiffMain();
  await SmartEnv.create(main_two, main_two.smart_env_config); // merges existing
  t.is(env.mains.length, 2, 'Now two mains present.');
  t.truthy(env.diff_collection, 'diff_collection from main_two config.');
  t.falsy(env.diff_collection.unloaded, 'diff_collection not unloaded yet.');
  t.falsy(env.the_collection.unloaded, 'the_collection also not unloaded yet.');

  // 3) Unload the second main
  env.unload_main(main_two);
  t.is(env.mains.length, 1, 'Removes main_two from .mains.');
  t.is(env['diff_main'], null, 'main_two property is nulled on env.');
  t.true(env.diff_collection === null, 'diff_collection null');
  t.falsy(env.the_collection.unloaded, 'the_collection belongs to main_one; stays loaded.');

  // 4) Unload the first main
  env.unload_main(main_one);
  t.is(env.mains.length, 0, 'No mains remain after unloading the last main.');
  t.is(env['the_main'], null, 'main_one property is cleared on env.');
  t.is(SmartEnv.global_env, null, 'Global ref should be cleared when no mains exist.');
  t.true(env.the_collection === null, 'the_collection null');
});

test.serial('SmartEnv unload_main() - only removes main-exclusive opts (integration)', async (t) => {
  // Clear any existing global environment references.
  clear_global_smart_env();

  // 1) Create environment with mainOne
  const main_one = new TheMain();
  main_one.smart_env_config.unique_opt_main_one = { some: 'value' };
  main_one.smart_env_config.shared_opt = { beep: 'boop' };
  const env = await SmartEnv.create(main_one, main_one.smart_env_config);
  t.is(env.mains.length, 1, 'Env has 1 main after mainOne creation.');
  t.truthy(env.opts.unique_opt_main_one, 'mainOne’s unique_opt_main_one is present.');
  t.truthy(env.opts.shared_opt, 'shared_opt is present from mainOne.');

  // 2) Add mainTwo
  const main_two = new DiffMain();
  main_two.smart_env_config.unique_opt_main_two = { hello: 'world' };
  main_two.smart_env_config.shared_opt = { beep: 'boop' };
  await SmartEnv.create(main_two, main_two.smart_env_config); // merges onto existing env
  t.is(env.mains.length, 2, 'Env has 2 mains after adding mainTwo.');
  t.truthy(env.opts.unique_opt_main_two, 'mainTwo’s unique_opt_main_two is merged.');
  t.truthy(env.opts.shared_opt, 'shared_opt remains, used by both mains.');

  // 3) Unload mainOne => remove only its exclusive opts
  env.unload_main(main_one);
  t.is(env.mains.length, 1, 'Only mainTwo remains after unloading mainOne.');

  t.falsy(env.opts.unique_opt_main_one, 'unique_opt_main_one is removed.');
  t.truthy(env.opts.unique_opt_main_two, 'unique_opt_main_two remains from mainTwo.');
  t.truthy(env.opts.shared_opt, 'shared_opt remains because it is still used by mainTwo.');

  // 4) Unload mainTwo => remove everything else
  env.unload_main(main_two);
  t.is(env.mains.length, 0, 'All mains are unloaded.');
  t.falsy(env.opts.unique_opt_main_two, 'unique_opt_main_two is removed.');
  t.falsy(env.opts.shared_opt, 'shared_opt is removed now that no main references it.');
});

test.serial('SmartEnv add_main & unload_main - reloading a main works', async (t) => {
  clear_global_smart_env();

  // 1) Create initial main
  const main_one = new TheMain();
  const env = await SmartEnv.create(main_one, main_one.smart_env_config);

  t.is(env.mains.length, 1, 'One main in env after creation.');
  t.truthy(env.the_collection, 'Env has the_collection from main_one config.');

  // 2) Add second main
  const main_two = new DiffMain();
  await SmartEnv.create(main_two, main_two.smart_env_config); // merges existing
  t.is(env.mains.length, 2, 'Now two mains present.');
  t.truthy(env.diff_collection, 'diff_collection from main_two config.');
  t.falsy(env.diff_collection.unloaded, 'diff_collection not unloaded yet.');
  t.falsy(env.the_collection.unloaded, 'the_collection also not unloaded yet.');

  // 3) Unload the second main
  env.unload_main(main_two);
  t.is(env.mains.length, 1, 'Removes main_two from .mains.');
  t.is(env['diff_main'], null, 'main_two property is nulled on env.');
  t.true(env.diff_collection === null, 'diff_collection null');
  t.falsy(env.the_collection.unloaded, 'the_collection belongs to main_one; stays loaded.');

  // 4) Reload the second main
  await SmartEnv.create(main_two, main_two.smart_env_config);
  t.is(env.mains.length, 2, 'Now two mains present.');
  t.truthy(env.diff_collection, 'diff_collection from main_two config.');
  t.falsy(env.diff_collection.unloaded, 'diff_collection not unloaded yet.');
  t.falsy(env.the_collection.unloaded, 'the_collection also not unloaded yet.');
});

/**
 * NEW TEST: Verifies that item_types specific to a single main are removed from opts when that main is unloaded.
 */
test.serial('SmartEnv unload_main() - item_types specific to a single main are removed from opts (integration)', async (t) => {
  clear_global_smart_env();

  // 1) Create mainOne with unique and shared item_types
  const main_one = new TheMain();
  class UniqueMainOneItemType extends CollectionItem {};
  class SharedItemType extends CollectionItem {};
  main_one.smart_env_config.item_types = {
    ...main_one.smart_env_config.item_types,
    UniqueMainOneItemType,
    SharedItemType,
  };

  const env = await SmartEnv.create(main_one, main_one.smart_env_config);
  t.is(env.mains.length, 1, 'Env has 1 main after mainOne creation.');
  t.truthy(env.opts.item_types.UniqueMainOneItemType, 'UniqueMainOneItemType in env opts.');
  t.truthy(env.opts.item_types.SharedItemType, 'SharedItemType in env opts.');

  // 2) Add mainTwo that references its own unique item_type plus the shared one
  const main_two = new DiffMain();
  class UniqueMainTwoItemType extends CollectionItem {};
  main_two.smart_env_config.item_types = {
    ...main_two.smart_env_config.item_types,
    UniqueMainTwoItemType,
    SharedItemType,
  };

  await SmartEnv.create(main_two, main_two.smart_env_config);
  t.is(env.mains.length, 2, 'Env has 2 mains after adding mainTwo.');
  t.truthy(env.opts.item_types.UniqueMainTwoItemType, 'UniqueMainTwoItemType in env opts.');
  t.truthy(env.opts.item_types.UniqueMainOneItemType, 'UniqueMainOneItemType still present.');
  t.truthy(env.opts.item_types.SharedItemType, 'SharedItemType is present for both mains.');

  // 3) Unload mainOne => remove item_types unique to mainOne
  env.unload_main(main_one);
  t.is(env.mains.length, 1, 'Only mainTwo remains after unloading mainOne.');
  t.falsy(env.opts.item_types.UniqueMainOneItemType, 'UniqueMainOneItemType removed with mainOne.');
  t.truthy(env.opts.item_types.UniqueMainTwoItemType, 'UniqueMainTwoItemType remains for mainTwo.');
  t.truthy(env.opts.item_types.SharedItemType, 'SharedItemType remains (still used by mainTwo).');

});


test.serial("opts.collections should be removed from env.opts when a main is unloaded", async (t) => {
  clear_global_smart_env();

  const main_one = new TheMain();
  const env = await SmartEnv.create(main_one, main_one.smart_env_config);
  t.truthy(env.opts.collections.the_collection, 'the_collection exists in env.opts.');

  const main_two = new DiffMain();
  await SmartEnv.create(main_two, main_two.smart_env_config);
  t.truthy(env.opts.collections.diff_collection, 'diff_collection exists in env.opts.');

  env.unload_main(main_one);
  t.falsy(env.opts.collections.the_collection, 'the_collection is removed from env.opts.');
})

test.serial("ensure smart_env_config in main is not overwritten by by opts from additional mains", async (t) => {
  clear_global_smart_env();
  const the_main = new TheMain();
  const env = await SmartEnv.create(the_main, the_main.smart_env_config);
  const diff_main = new DiffMain();
  await SmartEnv.create(diff_main, diff_main.smart_env_config);
  t.truthy(env.opts.collections.the_collection, 'the_collection exists in env.opts.');
  t.truthy(env.opts.collections.diff_collection, 'diff_collection exists in env.opts.');
  t.is(diff_main.smart_env_config.collections.the_collection, undefined, 'the_collection is not in main.smart_env_config.');
  t.is(the_main.smart_env_config.collections.diff_collection, undefined, 'diff_collection is not in main.smart_env_config.');
})
