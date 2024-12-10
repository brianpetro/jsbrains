// /test/sqlite_collection_data_adapter.test.js

import test from 'ava';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import { NodeFsSmartFsAdapter } from 'smart-file-system/adapters/node_fs.js';
import { Collection, CollectionItem } from '../main.js';
import { SqliteCollectionDataAdapter } from '../adapters/sqlite.js';
import { SmartSettings } from '../../smart-settings/smart_settings.js';

const __dirname = new URL('.', import.meta.url).pathname;

class TestSqliteMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_config() {
    return {
      env_path: __dirname,
      modules: {
        smart_settings: {
          class: SmartSettings,
        },
        smart_fs: {
          class: SmartFs,
          adapter: NodeFsSmartFsAdapter,
        }
      },
      collections: {
        collection: {
          class: Collection,
          data_adapter: SqliteCollectionDataAdapter,
        },
      },
      item_types: {
        CollectionItem,
      },
      default_settings: {
        collection: {
          sqlite_db_path: 'test_collection.sqlite',
        }
      }
    };
  }
}

async function load_sqlite_env(t) {
  const main = new TestSqliteMain();
  const env = await SmartEnv.create(main, main.smart_env_config);
  t.context.env = env;
}

test.beforeEach(async t => {
  await load_sqlite_env(t);
});

test.serial('SqliteCollectionDataAdapter save and load an item', async t => {
  const { env } = t.context;
  const col = env.collection;

  // Create a new item
  const item = await col.create_or_update({ key: 'sqlite_item', name: 'SQLite Test Item' });
  t.is(item.key, 'sqlite_item', 'Item key should be set');
  t.is(item.data.name, 'SQLite Test Item', 'Item data name should be set');
  item._queue_save = true;

  // Save the item
  await col.process_save_queue();

  // Check if database file exists
  const fs = col.data_fs;
  const dbPath = col.data_adapter.dbPath;
  t.true(await fs.exists(dbPath), 'SQLite database file should exist');

  // Reload environment
  const newEnv = await SmartEnv.create(new TestSqliteMain(), (new TestSqliteMain()).smart_env_config);
  const newCol = newEnv.collection;

  // Load all items
  await newCol.data_adapter.load_all_items();

  // Retrieve the loaded item
  const loadedItem = newCol.get('sqlite_item');
  t.truthy(loadedItem, 'Item should be loaded from SQLite database');
  t.is(loadedItem.data.name, 'SQLite Test Item', 'Loaded item data should match saved data');
});

test.serial('SqliteCollectionDataAdapter handles item deletion', async t => {
  const { env } = t.context;
  const col = env.collection;

  // Create and save an item
  const item = await col.create_or_update({ key: 'delete_sqlite_item', name: 'Delete Test Item' });
  item._queue_save = true;
  await col.process_save_queue();

  // Delete the item
  col.delete_many(['delete_sqlite_item']);
  await col.process_save_queue();

  // Reload environment
  const newEnv = await SmartEnv.create(new TestSqliteMain(), (new TestSqliteMain()).smart_env_config);
  const newCol = newEnv.collection;

  // Load all items
  await newCol.data_adapter.load_all_items();

  // Attempt to retrieve the deleted item
  const deletedItem = newCol.get('delete_sqlite_item');
  t.falsy(deletedItem, 'Deleted item should not exist in the collection');
});
