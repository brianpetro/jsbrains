import { FileCollectionDataAdapter, FileItemDataAdapter } from './_file.js';

/**
 * @class AjsonMultiFileCollectionDataAdapter
 * @extends FileCollectionDataAdapter
 * @description
 * Adapter for handling multi-file data storage for smart collections using AJSON format.
 * 
 * Responsibilities:
 * - Orchestrate loading and saving multiple items.
 * - Create and delegate to AjsonMultiFileItemDataAdapter instances for individual item operations.
 */
export class AjsonMultiFileCollectionDataAdapter extends FileCollectionDataAdapter {
  /**
   * Load a single item by its key.
   * Creates an instance of AjsonMultiFileItemDataAdapter and delegates.
   * @async
   * @param {string} key
   * @returns {Promise<void>}
   */
  async load_item(key) {
    const item = this.collection.get(key);
    if (!item) return;
    const adapter = new AjsonMultiFileItemDataAdapter(item);
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
    const adapter = new AjsonMultiFileItemDataAdapter(item);
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
    const adapter = new AjsonMultiFileItemDataAdapter(item);
    await adapter.delete();
  }

  /**
   * Load all items in the collection.
   * Typically, you'd iterate over known keys or metadata.
   * @async
   * @returns {Promise<void>}
   */
  async load_all_items() {
    // Implementation depends on how you track available items.
    // For each item key: await this.load_item(key);
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
    const load_queue = Object.values(this.collection.items).filter(i => i._queue_load);
    for (const item of load_queue) {
      await this.load_item(item.key);
    }
  }

  /**
   * Process any queued save operations.
   * @async
   * @returns {Promise<void>}
   */
  async process_save_queue() {
    await this.save_all_items();
  }
}

/**
 * @class AjsonMultiFileItemDataAdapter
 * @extends FileItemDataAdapter
 * @description
 * Item-level data adapter for AJSON multi-file storage.
 * 
 * Responsibilities:
 * - Reading a single item's `.ajson` file.
 * - Appending new AJSON lines when saving.
 * - Removing the file if the item is deleted.
 */
export class AjsonMultiFileItemDataAdapter extends FileItemDataAdapter {
  /**
   * @returns {string} The path or identifier for the item's data file.
   */
  get_data_path() {
    return this.item.data_path; // Assuming item has a data_path property
  }

  /**
   * Load the item from its `.ajson` file.
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    const data_path = this.get_data_path();
    if (!(await this.fs.exists(data_path))) {
      // If not found, queue import or handle as needed
      this.item.queue_import();
      return;
    }

    const data_ajson = await this._read_item_file();
    if (!data_ajson) {
      this.item.queue_import();
      return;
    }

    const ensured = this._ensure_trailing_commas(data_ajson);
    const parsed_data = this._parse_ajson_string_to_object(ensured);

    const rebuilt_ajson = [];
    this._process_parsed_entries(parsed_data, rebuilt_ajson);

    // If line counts differ, rewrite file for consistency
    const lines_in_data = ensured.split('\n').length;
    if (lines_in_data !== Object.keys(parsed_data).length) {
      await this.fs.write(data_path, rebuilt_ajson.join('\n'));
    }

    this.item._queue_load = false;
    this.item.loaded_at = Date.now();
  }

  /**
   * Save the item to its `.ajson` file.
   * If deleted, remove the file. Otherwise, append a new line.
   * @async
   * @param {string|null} [ajson=null]
   * @returns {Promise<void>}
   */
  async save(ajson = null) {
    if (!ajson) ajson = this.item.ajson;
    const data_path = this.get_data_path();

    if (!(await this.fs.exists(this.item.collection.data_dir))) {
      await this.fs.mkdir(this.item.collection.data_dir);
    }

    if (this.item.deleted) {
      this.item.collection.delete_item(this.item.key);
      if (await this.fs.exists(data_path)) await this.fs.remove(data_path);
    } else {
      await this.fs.append(data_path, '\n' + ajson);
    }

    this.item._queue_save = false;
  }

  /**
   * Delete the item's data (remove the file).
   * @async
   * @returns {Promise<void>}
   */
  async delete() {
    const data_path = this.get_data_path();
    await this.fs.remove(data_path);
    this.item.collection.delete_item(this.item.key);
  }

  /**
   * Overwrite the saved data with the current state. Typically used for cleanup.
   * @async
   * @param {string|null} [ajson=null]
   * @returns {Promise<void>}
   */
  async overwrite_saved_data(ajson = null) {
    const data_path = this.get_data_path();
    if (!ajson) ajson = this.item.ajson;
    await this.fs.write(data_path, ajson);
  }

  /**
   * Read the `.ajson` file associated with this item.
   * @private
   * @returns {Promise<string|null>} Raw AJSON string or null if empty.
   */
  async _read_item_file() {
    const data_path = this.get_data_path();
    const data_ajson = (await this.fs.adapter.read(data_path, 'utf-8', { no_cache: true })).trim();
    return data_ajson || null;
  }

  /**
   * Ensure AJSON lines end with a comma.
   * @private
   * @param {string} data_ajson
   * @returns {string}
   */
  _ensure_trailing_commas(data_ajson) {
    if (!data_ajson.trim().endsWith(',')) {
      return data_ajson.split('\n').map(line => line.endsWith(',') ? line : line + ',').join('\n');
    }
    return data_ajson;
  }

  /**
   * Parse AJSON into a JS object.
   * @private
   * @param {string} data_ajson
   * @returns {Object<string,any>}
   */
  _parse_ajson_string_to_object(data_ajson) {
    const trimmed = data_ajson.slice(0, -1);
    return JSON.parse(`{${trimmed}}`);
  }

  /**
   * Process parsed AJSON entries, update item data, and rebuild lines if needed.
   * @private
   * @param {Object<string, any>} parsed_data
   * @param {string[]} rebuilt_ajson
   */
  _process_parsed_entries(parsed_data, rebuilt_ajson) {
    for (const [ajson_key, value] of Object.entries(parsed_data)) {
      if (!value) continue; // skip null entries
      rebuilt_ajson.push(`${JSON.stringify(ajson_key)}: ${JSON.stringify(value)},`);

      // Parse AJSON key: ClassName:entity_key
      const [, ...key_parts] = ajson_key.split(":");
      const entity_key = key_parts.join(":");
      if (entity_key === this.item.key) {
        this.item.data = value;
      }
    }
  }
}
