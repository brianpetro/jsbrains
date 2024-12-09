import fs from 'fs';
import { SmartCollectionDataAdapter } from './_adapter.js';
import { deep_equal } from '../utils/deep_equal.js';

/**
 * Test adapter that simulates multi-file behavior using a single JSON file.
 * Maintains compatibility with collection.test.js while simplifying the storage mechanism.
 */
export class SingleJsonCollectionDataAdapter extends SmartCollectionDataAdapter {
  constructor(collection) {
    super(collection);
    this.test_data = {};
    this.load_test_data();
    
    // Pre-load all items from test data into collection
    Object.entries(this.test_data).forEach(([key, value]) => {
      if (!value) return;
      const [class_name, ...key_parts] = key.split(":");
      const item_key = key_parts.join(":");
      if (class_name === collection.item_type.name) {
        const item = new collection.item_type(collection.env);
        item.data = typeof value === 'string' ? { data: value } : { ...value };
        if (!item.data.key) item.data.key = item_key;
        collection.items[item_key] = item;
      }
    });
  }

  /**
   * Loads test data from the JSON file
   */
  load_test_data() {
    try {
      this.test_data = JSON.parse(fs.readFileSync(this.data_path, 'utf8'));
    } catch (err) {
      console.warn("Could not load test data, using empty object");
      this.test_data = {};
    }
  }

  get data_path() { 
    return "./test/_data.json"; 
  }

  /**
   * Loads data for a collection item from the test_data object
   * @param {CollectionItem} item - The item to load data for
   */
  async load(item) {
    try {
      const ajson_key = `${item.constructor.name}:${item.key}`;
      const data = this.test_data[ajson_key];

      if (!data) {
        console.log(`Data not found for: ${ajson_key}`);
        return item.queue_import();
      }

      const new_data = typeof data === 'string' ? { data } : { ...data };
      if (!new_data.key) new_data.key = item.key;
      
      // Only update if data actually changed
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

  /**
   * Saves an item's data to the test_data object and writes to disk
   * @param {CollectionItem} item - The item to save
   * @param {string} [ajson=null] - Optional AJSON string (not used in test adapter)
   * @returns {Promise<boolean>} Success status
   */
  async save(item) {
    const ajson_key = `${item.constructor.name}:${item.key}`;

    try {
      if (item.deleted) {
        delete this.test_data[ajson_key];
        delete this.collection.items[item.key];
        
        // Add deletion to pending saves
        if (!this.collection._pending_saves) {
          this.collection._pending_saves = {};
        }
        this.collection._pending_saves[ajson_key] = null;
      } else {
        const new_data = JSON.parse(JSON.stringify(item.data));
        if (!new_data.key) new_data.key = item.key;
        
        // Only update if data actually changed
        if (!this.test_data[ajson_key] || !deep_equal(this.test_data[ajson_key], new_data)) {
          this.test_data[ajson_key] = new_data;
          
          // Add to collection's pending saves
          if (!this.collection._pending_saves) {
            this.collection._pending_saves = {};
          }
          this.collection._pending_saves[ajson_key] = new_data;
        }
      }

      // Schedule a save if not already scheduled
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
   * Writes aggregated test_data to disk
   */
  save_to_disk() {
    try {
      // Apply pending saves to test_data
      if (this.collection._pending_saves) {
        Object.entries(this.collection._pending_saves).forEach(([key, value]) => {
          if (value === null) {
            delete this.test_data[key];
          } else {
            this.test_data[key] = value;
          }
        });
      }

      fs.writeFileSync(this.data_path, JSON.stringify(this.test_data, null, 2));
    } catch (err) {
      console.error("Error saving to disk:", err);
    }
  }
}