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
    this._initialized = false;
  }


  get fs() { return this.collection.data_fs || this.env.data_fs; }

  /**
   * Loads JSON data from the data file
   */
  async load_json_data() {
    if (this._initialized) return;
    
    try {
      if (!(await this.fs.exists(this.data_path))) {
        this.json_data = {};
      } else {
        const data = await this.fs.read(this.data_path);
        this.json_data = JSON.parse(data);
      }
      this._initialized = true;
    } catch (err) {
      console.warn("Could not load JSON data, using empty object", err);
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
    if(!this.json_data || Object.keys(this.json_data).length === 0) await this.load_json_data();
    else console.log('json data already loaded', this.json_data);
    try {
      const ajson_key = `${item.constructor.name}:${item.key}`;
      const data = this.json_data[ajson_key];

      if (!data) {
        console.log(`Data not found for: ${ajson_key}`);
        return;
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
    console.log('saving', ajson_key);
    
    if (!this._initialized) {
      await this.load_json_data();
    }

    try {
      if (item.deleted) {
        if (this.json_data[ajson_key]) {
          delete this.json_data[ajson_key];
          delete this.collection.items[item.key];
          
          if (!this.collection._pending_saves) {
            this.collection._pending_saves = {};
          }
          this.collection._pending_saves[ajson_key] = null;
        }
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

      if (Object.keys(this.collection._pending_saves || {}).length > 0) {
        if (!this._save_debounce) {
          this._save_debounce = setTimeout(async () => {
            await this.save_to_disk();
            this._save_debounce = null;
            this.collection._pending_saves = {};
          }, 100);
        }
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
      if (!this._initialized) {
        await this.load_json_data();
      }

      if (!this.json_data) {
        console.warn('Cannot save - json_data is not initialized');
        return;
      }

      if (this.collection._pending_saves) {
        let changes_made = false;
        Object.entries(this.collection._pending_saves).forEach(([key, value]) => {
          if (value === null) {
            if (key in this.json_data) {
              delete this.json_data[key];
              changes_made = true;
            }
          } else {
            this.json_data[key] = value;
            changes_made = true;
          }
        });

        if (changes_made) {
          if (Object.keys(this.json_data).length === 0) {
            if (await this.fs.exists(this.data_path)) {
              console.warn('Preventing save of empty data when file exists');
              return;
            }
          }

          const data = this.collection.settings.single_file_pretty 
            ? JSON.stringify(this.json_data, null, 2)
            : JSON.stringify(this.json_data);
          await this.fs.write(this.data_path, data);
        } else {
          console.log('No changes to save');
        }
      }
    } catch (err) {
      console.error("Error saving to disk:", err);
      throw err;
    }
  }
}