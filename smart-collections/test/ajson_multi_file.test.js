import test from 'ava';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import { NodeFsSmartFsAdapter } from 'smart-file-system/adapters/node_fs.js';
import { CollectionItem, Collection } from '../main.js';
import { AjsonMultiFileCollectionDataAdapter } from '../adapters/ajson_multi_file.js';
import { SmartSettings } from '../../smart-settings/smart_settings.js';

const __dirname = new URL('.', import.meta.url).pathname;

class TestMultiFileMain {
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
          data_adapter: AjsonMultiFileCollectionDataAdapter,
        },
      },
      item_types: {
        CollectionItem,
      },
      default_settings: {
        collection: {
          data_dir: 'multi',
        }
      }
    };
  }
}

async function load_multi_file_env(t) {
  const main = new TestMultiFileMain();
  const env = await SmartEnv.create(main, main.smart_env_config);
  t.context.env = env;
}

test.beforeEach(async t => {
  await load_multi_file_env(t);
});

test.serial('AjsonMultiFileCollectionDataAdapter save/load single item', async t => {
  const { env } = t.context;
  const col = env.collection;
  
  // Create a new item
  const item = await col.create_or_update({ key: 'my_item', foo: 'bar' });
  t.is(item.key, 'my_item', 'Item key should be set');
  t.is(item.data.foo, 'bar', 'Item data foo should be bar');
  item._queue_save = true;

  // Save the item
  await col.process_save_queue();
  await new Promise(resolve => setTimeout(resolve, 100));

  // Check if file exists
  const fs = col.data_fs;
  const data_path = `${col.data_dir}/my_item.ajson`;
  t.true(await fs.exists(data_path), 'Data file for my_item should exist');

  // Read file content
  const content = await fs.read(data_path);
  t.true(
    content.includes('"CollectionItem:my_item": '),
    'AJSON content should contain the saved item data key'
  );

  // Reload environment
  const newEnv = await SmartEnv.create(new TestMultiFileMain(), (new TestMultiFileMain()).smart_env_config);
  const newCol = newEnv.collection;

  // Load item
  newCol.items['my_item'] = newEnv.item_types.CollectionItem.load(newEnv, {key:'my_item'});
  newCol.items['my_item']._queue_load = true;
  await newCol.process_load_queue();

  const loadedItem = newCol.get('my_item');
  t.truthy(loadedItem, 'Item should be loaded from disk');
  t.is(loadedItem.data.foo, 'bar', 'Loaded item data should match saved data');
});

test.serial('AjsonMultiFileCollectionDataAdapter append updates', async t => {
  const { env } = t.context;
  const col = env.collection;

  // Create and save an item
  let item = await col.create_or_update({ key: 'append_item', value: 1 });
  item._queue_save = true;
  await col.process_save_queue();

  // Update the item
  item = await col.create_or_update({ key: 'append_item', value: 2 });
  item._queue_save = true;
  await col.process_save_queue();
  await new Promise(resolve => setTimeout(resolve, 100));

  const fs = col.data_fs;
  const data_path = `${col.data_dir}/append_item.ajson`;
  t.true(await fs.exists(data_path), 'Data file for append_item should exist');

  const content = await fs.read(data_path);
  t.true(content.split('\n').length >= 2, 'AJSON file should have multiple lines after append');
  t.regex(
    content, 
    /"CollectionItem:append_item": /,
    'Updated data should appear in file'
  );

  const newEnv = await SmartEnv.create(new TestMultiFileMain(), (new TestMultiFileMain()).smart_env_config);
  const newCol = newEnv.collection;
  newCol.items['append_item'] = newEnv.item_types.CollectionItem.load(newEnv, { key:'append_item' });
  newCol.items['append_item']._queue_load = true;
  await newCol.process_load_queue();

  const reLoadedItem = newCol.get('append_item');
  t.is(reLoadedItem.data.value, 2, 'Reloaded item should have updated value');
});

test.serial('AjsonMultiFileCollectionDataAdapter handle deletions', async t => {
  const { env } = t.context;
  const col = env.collection;

  // Create and save an item
  const item = await col.create_or_update({ key: 'delete_item', foo: 'bar' });
  item._queue_save = true;
  await col.process_save_queue();

  const fs = col.data_fs;
  const data_path = `${col.data_dir}/delete_item.ajson`;
  t.true(await fs.exists(data_path), 'Data file for delete_item should exist');

  // Delete the item
  col.delete_many(['delete_item']);
  item._queue_save = true;
  await col.process_save_queue();

  // should not exist
  t.false(await fs.exists(data_path), 'Data file for delete_item should not exist');
});
