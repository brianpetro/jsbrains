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
   * Delete a single item by its key.
   * @async
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete_item(key) {
    const item = this.collection.get(key);
    if (!item) return;
    const adapter = this.create_item_adapter(item);
    await adapter.delete();
  }

  /**
   * Load all items in the collection.
   * Typically, you'd iterate over known keys.
   * @async
   * @returns {Promise<void>}
   */
  async load_all_items() {
    // Implementation depends on how keys are discovered.
    // For each key: await this.load_item(key);
  }

  /**
   * Save all items that need saving.
   * @async
   * @returns {Promise<void>}
   */
  async save_all_items() {
    const save_queue = Object.values(this.collection.items).filter(i => i._queue_save);
    for (const item of save_queue) {
      await this.save_item(item.key);
    }
  }

  /**
   * Process any queued load operations.
   * @async
   * @returns {Promise<void>}
   */
  async process_load_queue() {
    this.collection.notices?.show('loading', `Loading ${this.collection.collection_key}...`, { timeout: 0 });
  
    const load_queue = Object.values(this.collection.items).filter(item => item._queue_load);
    if (!load_queue.length) {
      this.collection.notices?.remove('loading');
      return;
    }
  
    console.log(`Loading ${this.collection.collection_key}: ${load_queue.length} items`);
    const time_start = Date.now();
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
  
    this.collection.env.collections[this.collection.collection_key] = 'loaded';
    this.collection.load_time_ms = Date.now() - time_start;
    console.log(`Loaded ${this.collection.collection_key} in ${this.collection.load_time_ms}ms`);
    this.collection.loaded = load_queue.length;
    this.collection.notices?.remove('loading');
  }
  
  /**
   * Process any queued save operations.
   * @async
   * @returns {Promise<void>}
   */
  async process_save_queue() {
    this.collection.notices?.show('saving', `Saving ${this.collection.collection_key}...`, { timeout: 0 });
  
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
  
    console.log(`Saved ${this.collection.collection_key} in ${Date.now() - time_start}ms`);
    this.collection.notices?.remove('saving');
  }

  get_item_data_path(item) {
    const item_adapter = this.create_item_adapter(item);
    return item_adapter.get_data_path();
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
  get_data_path() {
    const dir = this.collection_adapter.collection.data_dir || 'multi';
    const sep = this.fs?.sep || '/';
    const file_name = this._get_data_file_name(this.item.key);
    return dir + sep + file_name + '.ajson';
  }

  /**
   * Transforms the item key into a safe filename.
   * Replaces spaces, slashes, and dots with underscores.
   * @private
   * @param {string} key 
   * @returns {string} safe file name
   */
  _get_data_file_name(key) {
    return key.replace(/[\s\/\.]/g, '_').replace(".md", "");
  }

  /**
   * Load the item from its `.ajson` file.
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    const raw_data = await this._read_item_file();
    if (!raw_data) {
      this.item.queue_import();
      return;
    }

    const { data, rewrite_needed } = this._parse(raw_data);

    if (data !== null && this.item.key in data) {
      // Active item
      this.item.data = data[this.item.key];
      this.item._queue_load = false;
      this.item.loaded_at = Date.now();
      if (rewrite_needed) {
        await this._rewrite_minimal_file(data);
      }
    } else {
      // Deleted item or never existed
      await this._cleanup_deleted_item();
    }
  }

  /**
   * Save the current state of the item by appending a new line to its `.ajson` file.
   * @async
   * @returns {Promise<void>}
   */
  async save() {
    const data_path = this.get_data_path();
    const dir = this.collection_adapter.collection.data_dir;
    if (!(await this.fs.exists(dir))) {
      await this.fs.mkdir(dir);
    }

    // Append a line representing current state (or null if deleted)
    const ajson_line = this._build_ajson_line(this.item, this.item.deleted ? null : this.item.data);
    await this.fs.append(data_path, '\n' + ajson_line);

    this.item._queue_save = false;
  }

  /**
   * Delete the item by appending a null-state line.
   * @async
   * @returns {Promise<void>}
   */
  async delete() {
    const data_path = this.get_data_path();
    const ajson_line = this._build_ajson_line(this.item, null);
    await this.fs.append(data_path, '\n' + ajson_line);
    this.item.collection.delete_item(this.item.key);
  }

  /**
   * Remove the file for a deleted item.
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async _cleanup_deleted_item() {
    const data_path = this.get_data_path();
    if (await this.fs.exists(data_path)) {
      await this.fs.remove(data_path);
    }
    this.item._queue_load = false;
  }

  /**
   * Rewrites the `.ajson` file to a minimal form with a single line if the item is active.
   * If the item is deleted, removes the file.
   * @private
   * @async
   * @param {Object|null} data
   */
  async _rewrite_minimal_file() {
    const data_path = this.get_data_path();
    if (this.item.data !== null) {
      const line = this._build_ajson_line(this.item, this.item.data);
      await this.fs.write(data_path, line);
    } else {
      // If no final state (deleted), remove file
      if (await this.fs.exists(data_path)) await this.fs.remove(data_path);
    }
  }

  /**
   * Build a single AJSON line for the given item and data.
   * @private
   * @param {Object} item 
   * @param {Object|null} data 
   * @returns {string}
   */
  _build_ajson_line(item, data) {
    const collection_key = item.collection_key;
    const key = item.key;
    const data_value = data === null ? 'null' : JSON.stringify(data);
    return `${JSON.stringify(`${collection_key}:${key}`)}: ${data_value},`;
  }

  /**
   * Reads the entire `.ajson` file for this item.
   * @private
   * @async
   * @returns {Promise<string|null>}
   */
  async _read_item_file() {
    try {
      const data_path = this.get_data_path();
      const data_ajson = await this.fs.adapter.read(data_path, 'utf-8', { no_cache: true });
      return data_ajson?.trim() || null;
    } catch (e) {
      console.warn('no data found for item');
      return null;
    }
  }

  /**
   * Parse the entire AJSON content as a JSON object, handle legacy keys, and extract final state.
   * @private
   * @param {string} ajson 
   * @returns {{final_state: Object|null, rewrite_needed: boolean}}
   */
  _parse(ajson) {
    let data = null;
    let rewrite_needed = false;

    if (!ajson.length) return { data, rewrite_needed };

    ajson = ajson.trim();
    ajson = this._make_backwards_compatible_with_trailing_comma_format(ajson);

    const original_line_count = ajson.split('\n').length;

    let json_str;
    try {
      json_str = '{' + ajson.slice(0, -1) + '}'; // remove trailing comma and wrap in braces
    } catch (e) {
      console.warn("Error preparing JSON string:", e);
      return { data, rewrite_needed: false };
    }

    try {
      data = JSON.parse(json_str);
    } catch (e) {
      // Try fixing trailing commas if needed
      if (ajson.split('\n').some(line => !line.endsWith(','))) {
        console.warn("fixing trailing comma error");
        ajson = ajson.split('\n').map(line => line.endsWith(',') ? line : line + ',').join('\n');
        return this._parse(ajson);
      }
      console.warn("Error parsing JSON:", e);
      return { data, rewrite_needed: true };
    }

    // If multiple lines for the same item or a changed key were found, rewrite needed
    console.log(ajson);
    console.log(Object.keys(data).length);
    console.log(original_line_count);
    // Also if original line count > 1 and we ended up with a single final state, we want to rewrite
    if (rewrite_needed || (original_line_count > Object.keys(data).length)) {
      rewrite_needed = true;
    }

    return { data, rewrite_needed };
  }

  /**
   * Make the AJSON backwards compatible with trailing commas format, ensuring every line ends with a comma.
   * @private
   * @param {string} ajson 
   * @returns {string}
   */
  _make_backwards_compatible_with_trailing_comma_format(ajson) {
    if (ajson[ajson.length - 1] !== ',') {
      ajson = ajson.split('\n').map(line => line.endsWith(',') ? line : line + ',').join('\n');
    }
    return ajson;
  }

  /**
   * Rewrites legacy AJSON keys to their modern equivalents, if needed.
   * @private
   * @param {string} ajson_key 
   * @returns {{new_ajson_key: string, changed: boolean}}
   */
  _rewrite_legacy_ajson_keys(ajson_key) {
    const [prefix, ...rest] = ajson_key.split(":");
    const item_key = rest.join(":");
    let new_prefix = prefix;
    let changed = false;
    if (class_to_collection_key[prefix]) {
      new_prefix = class_to_collection_key[prefix];
      if (new_prefix !== prefix) changed = true;
    }
    return { new_ajson_key: `${new_prefix}:${item_key}`, changed };
  }
}

export default {
  collection: AjsonMultiFileCollectionDataAdapter,
  item: AjsonMultiFileItemDataAdapter
};