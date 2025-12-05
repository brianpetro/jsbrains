import { FileCollectionDataAdapter, FileItemDataAdapter } from './_file.js';

// Maps class names to their corresponding collection keys for backward compatibility.
const class_to_collection_key = {
  'SmartSource': 'smart_sources',
  'SmartNote': 'smart_sources', // DEPRECATED
  'SmartBlock': 'smart_blocks',
  'SmartDirectory': 'smart_directories',
};
/**
 * @class AjsonMultiFileCollectionDataAdapter
 * @extends FileCollectionDataAdapter
 * @description
 * Adapter for handling multi-file data storage for smart collections using AJSON format.
 * AJSON stands for Append-only JSON log format for item states.
 * AJSON Format:
 * - Each file is essentially a log of states.
 * - Each line is of the form: `"collection_key:item_key": data,`
 * - Null data indicates a delete operation.
 * - On load, we parse all lines and compute the final state.
 * - On save, we append a new line with the latest state.
 * - Periodically, we rewrite to a minimal form (one line per active item).
 *
 * Responsibilities:
 * - Orchestrates loading, saving, and deleting items by key.
 * - Delegates all actual AJSON reading/writing to AjsonMultiFileItemDataAdapter.
 */
export class AjsonMultiFileCollectionDataAdapter extends FileCollectionDataAdapter {
  /**
   * The class to use for item adapters.
   * @type {typeof ItemDataAdapter}
   */
  ItemDataAdapter = AjsonMultiFileItemDataAdapter;


  /**
   * Load a single item by its key.
   * @async
   * @param {string} key
   * @returns {Promise<void>}
   */
  async load_item(key) {
    const item = this.collection.get(key);
    if (!item) return;
    const adapter = this.create_item_adapter(item);
    await adapter.load();
  }

  /**
   * Save a single item by its key.
   * @async
   * @param {string} key
   * @returns {Promise<void>}
   */
  async save_item(key) {
    const item = this.collection.get(key);
    if (!item) return;
    const adapter = this.create_item_adapter(item);
    await adapter.save();
  }

  /**
   * Process any queued load operations.
   * @async
   * @returns {Promise<void>}
   */
  async process_load_queue() {
    this.collection.emit_event('collection:load_started');
    this.collection.show_process_notice('loading_collection');


    // check if directory exists
    if(!(await this.fs.exists(this.collection.data_dir))){
      // create directory
      await this.fs.mkdir(this.collection.data_dir);
    }
  
    const load_queue = Object.values(this.collection.items).filter(item => item._queue_load);
    if (!load_queue.length) {
      this.collection.clear_process_notice('loading_collection');
      return;
    }
  
    const now = Date.now();
    console.log(`Loading ${this.collection.collection_key}: ${load_queue.length} items from disk`);
    const batch_size = 100; // could be configurable
  
    for (let i = 0; i < load_queue.length; i += batch_size) {
      const batch = load_queue.slice(i, i + batch_size);
      await Promise.all(batch.map(item => {
        const adapter = this.create_item_adapter(item);
        return adapter.load().catch(err => {
          console.warn(`Error loading item ${item.key}`, err);
          item.queue_load(); // re-queue or handle differently
        });
      }));
    }
    console.log(`Loaded ${this.collection.collection_key} from disk in ${Date.now() - now}ms`);
  
    this.collection.loaded = load_queue.length;
    this.collection.clear_process_notice('loading_collection');
    this.collection.emit_event('collection:load_completed');
  }
  
  /**
   * Process any queued save operations.
   * @async
   * @returns {Promise<void>}
   */
  async process_save_queue() {
    this.collection.emit_event('collection:save_started');
    this.collection.show_process_notice('saving_collection');
  

    const save_queue = Object.values(this.collection.items).filter(item => item._queue_save);
    console.log(`Saving ${this.collection.collection_key}: ${save_queue.length} items`);
    const time_start = Date.now();
    const batch_size = 50; // configurable
  
    for (let i = 0; i < save_queue.length; i += batch_size) {
      const batch = save_queue.slice(i, i + batch_size);
      await Promise.all(batch.map(item => {
        const adapter = this.create_item_adapter(item);
        return adapter.save().catch(err => {
          console.warn(`Error saving item ${item.key}`, err);
          item.queue_save();
        });
      }));
    }
    const deleted_items = Object.values(this.collection.items).filter(item => item.deleted);
    if(deleted_items.length){
      deleted_items.forEach(item => {
        delete this.collection.items[item.key];
      });
    }
  
    console.log(`Saved ${this.collection.collection_key} in ${Date.now() - time_start}ms`);
    this.collection.clear_process_notice('saving_collection');
    this.collection.emit_event('collection:save_completed');

  }

  get_item_data_path(key) {
    return [
      this.collection.data_dir || 'multi',
      this.fs?.sep || '/',
      this.get_data_file_name(key) + '.ajson'
    ].join('');
  }

  /**
   * Transforms the item key into a safe filename.
   * Replaces spaces, slashes, and dots with underscores.
   * @returns {string} safe file name
   */
  get_data_file_name(key) {
    return key.split('#')[0].replace(/[\s\/\.]/g, '_').replace(".md", "");
  }

  /**
   * Build a single AJSON line for the given item and data.
   * @param {Object} item 
   * @returns {string}
   */
  get_item_ajson(item) {
    const collection_key = item.collection_key;
    const key = item.key;
    const data_value = item.deleted ? 'null' : JSON.stringify(item.data);
    return `${JSON.stringify(`${collection_key}:${key}`)}: ${data_value},`;
  }
  
}

/**
 * @class AjsonMultiFileItemDataAdapter
 * @extends FileItemDataAdapter
 * @description
 * A generic adapter for a single item stored in an append-only `.ajson` file.
 *
 * Key points:
 * - On save or delete, append a single line representing the item’s current state (or null if deleted).
 * - On load, read the `.ajson` file, parse it as JSON, determine final state for the single item.
 *   If multiple historical lines or legacy keys, rewrite minimal form (one line if active).
 * - If item is deleted, remove the file.
 */
export class AjsonMultiFileItemDataAdapter extends FileItemDataAdapter {
  /**
   * Derives the `.ajson` file path from the collection's data_dir and item key.
   * @returns {string}
   */
  get data_path() {
    return this.collection_adapter.get_item_data_path(this.item.key);
  }


  /**
   * Load the item from its `.ajson` file.
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    try{
      const raw_data = await this.fs.adapter.read(this.data_path, 'utf-8', { no_cache: true });
      if (!raw_data) {
        this.item.queue_import();
        return;
      }
      const {rewrite, file_data} = this._parse(raw_data);
      if (rewrite) {
        if(file_data.length) await this.fs.write(this.data_path, file_data);
        else await this.fs.remove(this.data_path);
      }
      const last_import_mtime = this.item.data.last_import?.at || 0;
      if(last_import_mtime && this.item.init_file_mtime > last_import_mtime){
        this.item.queue_import();
      }
    } catch (e) {
      // console.warn("Error loading item (queueing import)", this.item.key, this.data_path, e);
      this.item.queue_import();
    }
  }

  /**
   * Parse the entire AJSON content as a JSON object, handle legacy keys, and extract final state.
   * @private
   * @param {string} ajson 
   * @returns {boolean}
   */
  _parse(ajson) {
    try {
      let rewrite = false;
  
      if (!ajson.length) return false;
  
      ajson = ajson.trim();
  
      const original_line_count = ajson.split('\n').length;
      const json_str = '{' + ajson.slice(0, -1) + '}'; // remove trailing comma and wrap in braces
      const data = JSON.parse(json_str);
      
      const entries = Object.entries(data);
      for(let i = 0; i < entries.length; i++){
        const [ajson_key, value] = entries[i];
        if(!value){
          delete data[ajson_key];
          rewrite = true;
          continue;
        }
        const { collection_key, item_key, changed } = this._parse_ajson_key(ajson_key);
        if (changed) {
          rewrite = true;
          data[collection_key + ":" + item_key] = value;
          delete data[ajson_key];
        }
        const collection = this.env[collection_key];
        if(!collection) continue;
        const existing_item = collection.get(item_key);
        if(!value.key) value.key = item_key; // backwards compatibility: item data must have a key
        if(existing_item){
          existing_item.data = value;
          existing_item._queue_load = false;
          existing_item.loaded_at = Date.now();
        }else{
          const ItemClass = collection.item_type;
          const new_item = new ItemClass(this.env, value);
          new_item._queue_load = false;
          new_item.loaded_at = Date.now();
          collection.set(new_item);
        }
  
      }
  
      if (rewrite || (original_line_count > entries.length)) {
        rewrite = true;
      }
  
      return {
        rewrite,
        file_data: rewrite ? 
          Object.entries(data).map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)},`).join('\n')
          : null
      };
    } catch (e) {
      // Try fixing trailing commas if needed (for backwards compatibility)
      if (ajson.split('\n').some(line => !line.endsWith(','))) {
        console.warn("fixing trailing comma error");
        ajson = ajson.split('\n').map(line => line.endsWith(',') ? line : line + ',').join('\n');
        return this._parse(ajson);
      }
      console.warn("Error parsing JSON:", e);
      return { rewrite: true, file_data: null };
    }
  }
  _parse_ajson_key(ajson_key){
    let changed;
    let [collection_key, ...item_key] = ajson_key.split(":");
    // temp for backwards compatibility
    if(class_to_collection_key[collection_key]){
      collection_key = class_to_collection_key[collection_key];
      changed = true;
    }
    return {
      collection_key,
      item_key: item_key.join(":"),
      changed
    };
  }
  /**
   * Save the current state of the item by appending a new line to its `.ajson` file.
   * @async
   * @returns {Promise<void>}
   */
  async save(retries = 0) {
    try{
      // Append a line representing current state (or null if deleted)
      const ajson_line = this.get_item_ajson();
      await this.fs.append(this.data_path, '\n' + ajson_line);
      this.item._queue_save = false;
    }catch(e){
      if(e.code === 'ENOENT' && retries < 1){
        const dir = this.collection_adapter.collection.data_dir;
        if (!(await this.fs.exists(dir))) {
          await this.fs.mkdir(dir);
        }
        return await this.save(retries + 1);
      }
      console.warn("Error saving item", this.data_path, this.item.key, e);
    }
  }


  /**
   * Build a single AJSON line for the given item and data.
   * @param {Object} item 
   * @returns {string}
   */
  get_item_ajson() {
    return this.collection_adapter.get_item_ajson(this.item);
  }

}

export default {
  collection: AjsonMultiFileCollectionDataAdapter,
  item: AjsonMultiFileItemDataAdapter
};