import { SmartCollectionDataAdapter } from './_adapter.js';
import { deep_equal } from '../utils/deep_equal.js';

/**
 * Adapter that stores collection data in a single JSON file.
 * Simpler alternative to multi-file storage for testing and small collections.
 */
export class JsonSingleFileCollectionDataAdapter extends SmartCollectionDataAdapter {
  constructor(collection) {
    super(collection);
    this.json_data = null;
    this.load_json_data();
  }

  get fs() { return this.collection.data_fs || this.env.data_fs; }

  /**
   * Loads JSON data from the data file
   */
  async load_json_data() {
    try {
      if(!(await this.fs.exists(this.data_path))) return this.json_data = {};
      const data = await this.fs.read(this.data_path, 'utf8');
      this.json_data = JSON.parse(data);
    } catch (err) {
      console.warn("Could not load JSON data, using empty object");
      this.json_data = {};
    }
  }

  get data_path() { 
    return this.collection.settings.single_file_data_path || `.smart-env/${this.collection.collection_key}.json`;
  }

  /**
   * Loads data for a collection item from the json_data object
   */
  async load(item) {
    if(!this.json_data) await this.load_json_data();
    try {
      const ajson_key = `${item.constructor.name}:${item.key}`;
      const data = this.json_data[ajson_key];

      if (!data) {
        console.log(`Data not found for: ${ajson_key}`);
        return item.queue_import();
      }

      const new_data = typeof data === 'string' ? { data } : { ...data };
      if (!new_data.key) new_data.key = item.key;
      
      if (!deep_equal(item.data, new_data)) {
        item.data = new_data;
      }
      
      item._queue_load = false;
      item.loaded_at = Date.now();

    } catch (err) {
      console.log(`Error loading collection item: ${item.key}`);
      console.warn(err.stack);
      item.queue_load();
    }
  }

  async save(item) {
    const ajson_key = `${item.constructor.name}:${item.key}`;

    try {
      if (item.deleted) {
        delete this.json_data[ajson_key];
        delete this.collection.items[item.key];
        
        if (!this.collection._pending_saves) {
          this.collection._pending_saves = {};
        }
        this.collection._pending_saves[ajson_key] = null;
      } else {
        const new_data = JSON.parse(JSON.stringify(item.data));
        if (!new_data.key) new_data.key = item.key;
        
        if (!this.json_data[ajson_key] || !deep_equal(this.json_data[ajson_key], new_data)) {
          this.json_data[ajson_key] = new_data;
          
          if (!this.collection._pending_saves) {
            this.collection._pending_saves = {};
          }
          this.collection._pending_saves[ajson_key] = new_data;
        }
      }

      if (Object.keys(this.collection._pending_saves || {}).length > 0 && !this.collection._save_timeout) {
        this.collection._save_timeout = setTimeout(() => {
          this.save_to_disk();
          delete this.collection._save_timeout;
          this.collection._pending_saves = {};
        }, 0);
      }

      item._queue_save = false;
      return true;
    } catch (err) {
      console.warn(`Error saving collection item: ${item.key}`);
      console.warn(err.stack);
      item.queue_save();
      return false;
    }
  }

  /**
   * Writes aggregated json_data to disk
   */
  async save_to_disk() {
    try {
      if (this.collection._pending_saves) {
        Object.entries(this.collection._pending_saves).forEach(([key, value]) => {
          if (value === null) {
            delete this.json_data[key];
          } else {
            this.json_data[key] = value;
          }
        });
      }
      if(this.collection.settings.single_file_pretty){
        await this.fs.write(this.data_path, JSON.stringify(this.json_data, null, 2));
      }else{
        await this.fs.write(this.data_path, JSON.stringify(this.json_data));
      }
    } catch (err) {
      console.error("Error saving to disk:", err);
    }
  }
}