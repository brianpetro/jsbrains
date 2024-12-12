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
  
}

/**
 * @class AjsonMultiFileItemDataAdapter
 * @extends FileItemDataAdapter
 * @description
 * A generic adapter for a single item stored in an append-only `.ajson` file.
 *
 * Key points:
 * - On save or delete, append a single line representing the item’s current state (or null if deleted).
 * - On load, read all lines for this single item, determine final state.
 *   If multiple historical lines or deleted, rewrite minimal form (one line if active, or remove file if deleted).
 *
 * Note: This class does not handle multiple items (like blocks related to a source).
 *       It assumes one file = one item transaction log.
 *       Block or multi-item logic must be implemented in a subclass.
 */
export class AjsonMultiFileItemDataAdapter extends FileItemDataAdapter {
  /**
   * Derives the `.ajson` file path from the collection's data_dir and item key.
   * Removes invalid characters from key and appends `.ajson`.
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
   * Replaces spaces, slashes, and dots with underscores, 
   * also removes ".md" suffix if present.
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
    const data_path = this.get_data_path();
    if (!(await this.fs.exists(data_path))) {
      // If no file, item might need import
      this.item.queue_import();
      return;
    }

    const raw_data = await this._read_item_file();
    if (!raw_data) {
      this.item.queue_import();
      return;
    }

    const lines = raw_data.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      this.item.queue_import();
      return;
    }

    // Parse lines for this single item
    // Each line format: `"collection_key:item_key": {...},`
    const states = this._parse_lines(lines, this.item.key);
    const final_state = this._determine_final_state(states);

    if (final_state !== null) {
      // Active item
      this.item.data = final_state;
      this.item._queue_load = false;
      this.item.loaded_at = Date.now();
      // If multiple lines existed, rewrite minimal file with a single line
      if (states.length > 1) await this._rewrite_minimal_file(final_state);
    } else {
      // Item deleted or never existed
      // Remove file since item no longer active
      await this._cleanup_deleted_item();
    }
  }

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

  async delete() {
    const data_path = this.get_data_path();
    const ajson_line = this._build_ajson_line(this.item, null);
    await this.fs.append(data_path, '\n' + ajson_line);
    this.item.collection.delete_item(this.item.key);
  }

  async overwrite_saved_data(ajson = null) {
    // Overwrite with the current item state if not provided
    const data_path = this.get_data_path();
    if (!ajson) {
      if (!this.item.deleted) {
        ajson = this._build_ajson_line(this.item, this.item.data);
      } else {
        // If deleted, remove file if exists
        if (await this.fs.exists(data_path)) {
          await this.fs.remove(data_path);
        }
        return;
      }
    }
    await this.fs.write(data_path, ajson);
  }

  async _cleanup_deleted_item() {
    const data_path = this.get_data_path();
    if (await this.fs.exists(data_path)) {
      await this.fs.remove(data_path);
    }
    this.item._queue_load = false;
  }

  async _rewrite_minimal_file(final_state) {
    const data_path = this.get_data_path();
    if (final_state !== null) {
      const line = this._build_ajson_line(this.item, final_state);
      await this.fs.write(data_path, line);
    } else {
      // If no final state (deleted), remove file
      if (await this.fs.exists(data_path)) await this.fs.remove(data_path);
    }
  }

  _parse_lines(lines, item_key) {
    const states = [];
    for (const line of lines) {
      const trimmed = line.replace(/,$/, '');
      const idx = trimmed.indexOf(':');
      if (idx === -1) continue;
      const key_str = trimmed.slice(0, idx).trim();
      const value_str = trimmed.slice(idx + 1).trim();
      let ajson_key;
      let value;
      try {
        ajson_key = JSON.parse(key_str);
        value = JSON.parse(value_str);
      } catch (e) {
        console.warn("Error parsing line:", line, e);
        continue;
      }

      // Rewrite legacy keys if needed
      const { new_ajson_key } = this._rewrite_legacy_ajson_keys(ajson_key);
      const parsed_item_key = new_ajson_key.split(':').slice(1).join(':');
      if (parsed_item_key === item_key) {
        states.push(value);
      }
    }
    return states;
  }

  _determine_final_state(states) {
    // The final state is the last non-null entry
    const last_state = [...states].reverse().find(s => s !== null);
    return last_state || null;
  }

  _build_ajson_line(item, data) {
    const collection_key = item.collection_key;
    const key = item.key;
    const data_value = data === null ? 'null' : JSON.stringify(data);
    return `${JSON.stringify(`${collection_key}:${key}`)}: ${data_value},`;
  }

  async _read_item_file() {
    const data_path = this.get_data_path();
    const data_ajson = await this.fs.adapter.read(data_path, 'utf-8', { no_cache: true });
    return data_ajson?.trim() || null;
  }

  // temp: for backwards compatibility
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
  _make_backwards_compatible_with_trailing_comma_format(ajson) {
    // if last character is not a comma, needs comma added to every line
    if (ajson[ajson.length - 1] !== ',') {
      ajson = ajson.split('\n').map(line => line.endsWith(',') ? line : line + ',').join('\n');
    }
    return ajson;
  }
}