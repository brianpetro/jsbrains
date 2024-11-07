import { ajson_merge } from '../utils/ajson_merge.js';
import { SmartCollectionDataAdapter } from './_adapter.js';

/**
 * Maps collection class names to their corresponding collection keys.
 * @type {Object.<string, string>}
 * @const
 */
const class_to_collection_key = {
  'SmartSource': 'smart_sources',
  'SmartNote': 'smart_sources', // DEPRECATED: added for backward compatibility
  'SmartBlock': 'smart_blocks',
  'SmartDirectory': 'smart_directories',
};

/**
 * Adapter for handling multi-file data storage for smart collections.
 * Uses AJSON format for data persistence.
 * 
 * AJSON features:
 * - Optimized for large files (embeddings JSON)
 * - Includes comma at end of each line
 * - Requires GUID as key for each object/line
 * - Handles deletions as {key: null|undefined}
 * - Appends changes since last load
 * 
 * @extends SmartCollectionDataAdapter
 */
export class SmartCollectionMultiFileDataAdapter extends SmartCollectionDataAdapter {
  /**
   * Gets the filesystem interface to use for data operations.
   * Uses collection's data_fs if available, otherwise falls back to environment's data_fs.
   * @returns {Object} The filesystem interface
   */
  get fs() { return this.collection.data_fs || this.env.data_fs; }

  /**
   * Gets the data folder path where .ajson files are stored.
   * @returns {string} Path to the data folder
   */
  get data_folder() { return this.collection.data_dir || 'multi'; }

  /**
   * Loads data for a collection item from its corresponding .ajson file.
   * Handles:
   * - AJSON parsing and merging
   * - Null overwrite patterns
   * - Inactive item types
   * - Change detection via loaded_at timestamp
   * @param {CollectionItem} item - The collection item to load data for
   * @returns {Promise<void>}
   */
  async load(item) {
    if(!(await this.fs.exists(this.data_folder))) await this.fs.mkdir(this.data_folder);
    try{
      // no_cache is necessary to prevent caching issues in Obsidian (may need to clarify mechanism since seemed to stop after initial force load without cache)
      const data_ajson = (await this.fs.adapter.read(item.data_path, 'utf-8', {no_cache: true})).trim();
      if(!data_ajson){
        console.log(`Data file not found: ${item.data_path}`);
        return item.queue_import(); // queue import and return early if data file missing or empty
      }
      const ajson_lines = data_ajson.split('\n');
      const parsed_data = ajson_lines
        .reduce((acc, line) => {
          try {
            const parsed = JSON.parse(`{${line}}`);
            if (Object.values(parsed)[0] === null) {
              if (acc[Object.keys(parsed)[0]]) delete acc[Object.keys(parsed)[0]];
              return acc;
            }
            return ajson_merge(acc, parsed);
          } catch (err) {
            console.warn("Error parsing line: ", line);
            console.warn(err.stack);
            return acc;
          }
        }, {});
      // array with same length as parsed_data
      const rebuilt_ajson = [];
      Object.entries(parsed_data)
        .forEach(([ajson_key, value], index) => {
          if (!value) return; // handle null values (deleted)
          rebuilt_ajson.push(`${JSON.stringify(ajson_key)}: ${JSON.stringify(value)}`);
          const [class_name, ...key_parts] = ajson_key.split(":");
          const entity_key = key_parts.join(":"); // key is file path
          if (entity_key === item.key) item.data = value;
          else {
            if (!this.env[class_to_collection_key[class_name]]) return console.warn(`Collection class not found: ${class_name}`);
            this.env[class_to_collection_key[class_name]].items[entity_key] = new this.env.item_types[class_name](this.env, value);
          }
        })
      ;
      item._queue_load = false;
      if (ajson_lines.length !== Object.keys(parsed_data).length) this.fs.write(item.data_path, rebuilt_ajson.join('\n'));
      item.loaded_at = Date.now();
    }catch(err){
      // if file not found, queue import
      if(err.message.includes("ENOENT")) return item.queue_import();
      console.log("Error loading collection item: " + item.key);
      console.warn(err.stack);
      item.queue_load();
      return;
    }
  }

  /**
   * Saves data for a collection item to its corresponding .ajson file.
   * Handles item deletion and appending new data.
   * @param {CollectionItem} item - The collection item to save data for
   * @param {string} [ajson=null] - Optional AJSON string to save. If not provided, uses item.ajson
   * @returns {Promise<boolean>} True if save was successful, false otherwise
   */
  async save(item, ajson=null) {
    if(!ajson) ajson = item.ajson;
    if(!(await this.fs.exists(this.data_folder))) await this.fs.mkdir(this.data_folder);
    try {
      if(item.deleted){
        this.collection.delete_item(item.key);
        if((await this.fs.exists(item.data_path))) await this.fs.remove(item.data_path);
      } else {
        await this.fs.append(item.data_path, '\n' + ajson); // prevent overwriting the file
      }
      item._queue_save = false;
      return true;
    } catch (err) {
      if(err.message.includes("ENOENT")) return; // already deleted
      console.warn("Error saving collection item: ", item.key);
      console.warn(err.stack);
      item.queue_save();
      return false;
    }
  }
}