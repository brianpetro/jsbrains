/**
 * @file smart_actions.test.js
 * @description Integration tests for the SmartActions collection and SmartAction items,
 *              closely following the style of `markdown_source.test.js`.
 */

import test from 'ava';
import { SmartEnv } from 'smart-environment/smart_env.js'; 
import { SmartFs } from 'smart-file-system/smart_fs.js';
import { NodeFsSmartFsAdapter } from 'smart-file-system/adapters/node_fs.js';

// The main classes we’re testing:
import { SmartActions } from '../smart_actions.js';
import { SmartAction } from '../smart_action.js';

// A data adapter for storing actions (like your ajson_multi_file logic):
import action_data_adapter from '../adapters/data/ajson_actions_data_adapter.js';
import path from 'path';
import fs from 'fs';

// 1) Create a function that sets up the environment, similar to create_test_env
async function create_test_env() {
  // Suppose we store test data in "test/test-content/smart-actions-test" ...
  const env_path = path.join(process.cwd(), 'test/test-content/smart-actions-test');
  // Make sure that directory exists
  if (!fs.existsSync(env_path)) {
    fs.mkdirSync(env_path, { recursive: true });
  }

  // Initialize the environment
  const env = await SmartEnv.create(
    {
      load_settings(){ return {}; },
      save_settings(){},
      get settings(){ return {}; }
    },
    {
      env_path,
      modules: {
        smart_fs: { class: SmartFs, adapter: NodeFsSmartFsAdapter },
      },
      collections: {
        smart_actions: {
          class: SmartActions,
          data_adapter: action_data_adapter,
        },
      },
      item_types: {
        SmartAction
      },
      default_settings: {
        smart_actions: {
          data_dir: 'actions_multi' // Sub-folder where .ajson files get stored
        }
      }
    }
  );

  // The collection automatically is placed in env.smart_actions
  return env;
}

// 2) Use test.before and test.after (or test.beforeEach) to manage environment creation
test.before(async t => {
  t.context.env = await create_test_env();
});

test.after(async t => {
  // Optional cleanup logic, e.g. remove the temp folder
  // fs.rmdirSync(path.join(process.cwd(), 'test/test-content/smart-actions-test'), { recursive: true });
});

// 3) Now write actual tests
test.serial('Register and run an mjs action', async t => {
  const { env } = t.context;
  const actions = env.smart_actions;

  // Register a new action
  actions.register_action('demo_mjs', {
    source_type: 'mjs',
    module_path: '/fake/path/to/demo_action.mjs',
    api_spec: {
      info: { title: 'Demo MJS Action', version: '1.0.0' },
      paths: {
        '/do_something': { post: { description: 'Demo MJS action route' } }
      }
    }
  });

  // Force a save so that an .ajson file is created
  const actionItem = actions.get('demo_mjs');
  actionItem.queue_save();

  // process_save_queue => writes an .ajson file 
  await actions.process_save_queue();

  // Now run the action
  const result = await actions.run_action('demo_mjs', { foo: 123 });
  t.deepEqual(result, { fromMjs: true, params: { foo: 123 } }, 'Should get stub MJS result');

  // Check the openapi / api_spec
  t.truthy(actionItem.openapi, 'api_spec is attached');
  t.is(actionItem.openapi.info.title, 'Demo MJS Action');
});

test.serial('Register and run an api action', async t => {
  const { env } = t.context;
  const actions = env.smart_actions;

  actions.register_action('myApiAction', {
    source_type: 'api',
    // Possibly store an endpoint or credentials:
    api_url: 'https://example.com/api/run',
    api_spec: {
      info: { title: 'My API Action', version: '2.0.0' },
      paths: {
        '/invoke_something': { post: { description: 'Call the remote API' } }
      }
    }
  });

  // Force a save
  const actionItem = actions.get('myApiAction');
  actionItem.queue_save();
  await actions.process_save_queue();

  // Run the action
  const result = await actions.run_action('myApiAction', { paramA: 999 });
  t.deepEqual(result, { fromApi: true, params: { paramA: 999 } }, 'Stub API adapter result');

  // Check the openapi spec
  t.is(actionItem.openapi.info.title, 'My API Action');
});

test.serial('Load existing actions from .ajson and confirm no re-import needed if no changes', async t => {
  const { env } = t.context;
  const actions = env.smart_actions;

  // Suppose we already have some actions that were saved
  // We'll "reload" them by re-initializing the environment:
  const secondEnv = await create_test_env();
  const secondActions = secondEnv.smart_actions;

  // process_load_queue => reads .ajson files
  await secondActions.process_load_queue();

  // Wait a bit
  await new Promise(r => setTimeout(r, 100));

  // Confirm the actions loaded
  const reloadedMjs = secondActions.get('demo_mjs');
  t.truthy(reloadedMjs, 'demo_mjs action is loaded from .ajson');
  t.is(reloadedMjs.data.module_path, '/fake/path/to/demo_action.mjs');

  // Confirm no re-import is needed
  // If your logic flags _queue_import, check it is false
  t.false(reloadedMjs._queue_import, 'No import queued if no changes');
});

test.serial('Delete an action and confirm .ajson removal', async t => {
  const { env } = t.context;
  const actions = env.smart_actions;

  actions.register_action('tempAction', { someField: 'test123' });
  const item = actions.get('tempAction');
  item.queue_save();
  await actions.process_save_queue();

  // Confirm .ajson exists
  const data_file_name = 'tempAction.ajson'; // or however your adapter names it
  const data_path = path.join(actions.data_dir, data_file_name);
  // Possibly wait a moment for the file to appear
  let exists = fs.existsSync(path.join(env.opts.env_path, data_path));
  t.true(exists, 'tempAction.ajson should exist after saving');

  // Now delete it
  item.delete();
  await actions.process_save_queue();

  // Check that .ajson is removed
  exists = fs.existsSync(path.join(env.opts.env_path, data_path));
  t.false(exists, 'Data file should be removed after deleting the action');
});
