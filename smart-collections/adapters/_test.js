import fs from 'fs';
import { SmartCollectionDataAdapter } from './_adapter.js';
import { ajson_merge } from '../utils/ajson_merge.js';

const class_to_collection_key = {
  'SmartSource': 'smart_sources',
  'SmartNote': 'smart_sources', // DEPRECATED: added for backward compatibility
  'SmartBlock': 'smart_blocks',
  'SmartDirectory': 'smart_directories',
};

export class SmartCollectionTestDataAdapter extends SmartCollectionDataAdapter {
  constructor(collection) {
    super(collection);
    this.test_data = JSON.parse(fs.readFileSync(this.data_path, 'utf8'));
  }

  get data_path() { return "./test/_data.json"; }

  async load(item) {
    try {
      const ajson_key = `${item.constructor.name}:${item.key}`;
      const data = this.test_data[ajson_key];

      if (!data) {
        console.log(`Data not found for: ${ajson_key}`);
        return item.queue_import();
      }

      const parsed_data = {};
      data.split('\n').forEach(line => {
        try {
          const parsed = JSON.parse(`{${line}}`);
          if (Object.values(parsed)[0] === null) {
            if (parsed_data[Object.keys(parsed)[0]]) delete parsed_data[Object.keys(parsed)[0]];
          } else {
            Object.assign(parsed_data, parsed);
          }
        } catch (err) {
          console.warn("Error parsing line: ", line);
          console.warn(err.stack);
        }
      });

      Object.entries(parsed_data).forEach(([parsed_ajson_key, value]) => {
        if (!value) return; // handle null values (deleted)
        const [class_name, ...key_parts] = parsed_ajson_key.split(":");
        const entity_key = key_parts.join(":");
        if (entity_key === item.key) {
          item.data = value;
        } else {
          if (!this.env[class_to_collection_key[class_name]]) {
            return console.warn(`Collection class not found: ${class_name}`);
          }
          this.env[class_to_collection_key[class_name]].items[entity_key] = new this.env.item_types[class_name](this.env, value);
        }
      });

      item._queue_load = false;
      item.loaded_at = Date.now();
    } catch (err) {
      console.log(`Error loading collection item: ${item.key}`);
      console.warn(err.stack);
      item.queue_load();
    }
  }

  async save(item, ajson = null) {
    if (!ajson) ajson = item.ajson;
    const ajson_key = `${item.constructor.name}:${item.key}`;

    try {
      if (item.deleted) {
        this.collection.delete_item(item.key);
        delete this.test_data[ajson_key];
      } else {
        this.test_data[ajson_key] += '\n' + ajson;
      }

      // Simulate writing to file
      fs.writeFileSync(this.data_path, JSON.stringify(this.test_data, null, 2));

      item._queue_save = false;
      return true;
    } catch (err) {
      console.warn(`Error saving collection item: ${item.key}`);
      console.warn(err.stack);
      item.queue_save();
      return false;
    }
  }
}