import { SmartCollectionDataAdapter } from './_adapter.js';

/**
 * Maps collection class names to their corresponding collection keys.
 * Used to route data entries to the correct collection from a loaded AJSON file.
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
 * AJSON Features:
 * - Optimized for large files.
 * - Includes a trailing comma at the end of each line.
 * - Requires GUID (here, a unique key) for each object line.
 * - Handles item deletions via `null` assignments.
 * - Appends changes since last load, rather than rewriting entire files.
 *
 * This adapter:
 * - Loads individual items from `.ajson` files within a specified data folder.
 * - Saves updates by appending lines to existing `.ajson` files (append-only).
 * - If an item is deleted, it removes the file.
 * - Handles backward compatibility for older data files.
 *
 * @extends {SmartCollectionDataAdapter}
 */
export class AjsonMultiFileCollectionDataAdapter extends SmartCollectionDataAdapter {
  /**
   * Filesystem adapter for performing file operations.
   * Uses collection's data_fs if available, else falls back to env's data_fs.
   * @returns {Object} The filesystem interface
   */
  get fs() {
    return this.collection.data_fs || this.env.data_fs;
  }

  /**
   * Directory where `.ajson` files are stored. Defaults to 'multi'.
   * Can be overridden by collection's `data_dir`.
   * @returns {string}
   */
  get data_folder() {
    return this.collection.data_dir || 'multi';
  }

  /**
   * Load data for a single collection item from its `.ajson` file.
   * This method attempts to parse the file as AJSON and merge its entries.
   * It supports:
   * - Backward compatibility for files missing trailing commas.
   * - Handling null (deleted) entries.
   * - Inserting the item data into the environment if it's a recognized type.
   *
   * @param {CollectionItem} item The collection item to load.
   * @returns {Promise<void>}
   * @throws Will re-queue load if file not found or parsing error occurs.
   */
  async load(item) {
    if (!(await this.fs.exists(this.data_folder))) {
      await this.fs.mkdir(this.data_folder);
    }

    try {
      let data_ajson = await this._read_item_file(item);
      if (!data_ajson) {
        console.log(`Data file not found or empty for: ${item.data_path}`);
        return item.queue_import(); // Queue import if no file
      }

      data_ajson = this._ensure_trailing_commas(data_ajson);
      const parsed_data = this._parse_ajson_string_to_object(data_ajson);

      // Attempt to rebuild a consistent AJSON file if lines differ from parsed entries
      const rebuilt_ajson = [];
      this._process_parsed_entries(parsed_data, item, rebuilt_ajson);

      // If line count differs, rewrite file for consistency
      const lines_in_data = data_ajson.split('\n').length;
      if (lines_in_data !== Object.keys(parsed_data).length) {
        await this.fs.write(item.data_path, rebuilt_ajson.join('\n'));
      }

      item._queue_load = false;
      item.loaded_at = Date.now();
    } catch (err) {
      if (err.message.includes("ENOENT")) {
        // File not found, queue import
        return item.queue_import();
      }
      console.log("Error loading collection item: " + item.key);
      console.warn(err.stack);
      item.queue_load();
    }
  }

  /**
   * Save data for a collection item.
   * If the item is deleted, the file is removed.
   * Otherwise, a new line (AJSON entry) is appended.
   *
   * @param {CollectionItem} item The collection item to save.
   * @param {string|null} [ajson=null] Custom AJSON string. Defaults to item.ajson if not provided.
   * @returns {Promise<boolean>} True if save was successful, false otherwise.
   */
  async save(item, ajson = null) {
    if (!ajson) ajson = item.ajson;
    if (!(await this.fs.exists(this.data_folder))) await this.fs.mkdir(this.data_folder);

    try {
      if (item.deleted) {
        // If deleted, remove from collection and delete file
        this.collection.delete_item(item.key);
        if (await this.fs.exists(item.data_path)) await this.fs.remove(item.data_path);
      } else {
        // Append line to file (append-only approach)
        await this.fs.append(item.data_path, '\n' + ajson);
      }
      item._queue_save = false;
      return true;
    } catch (err) {
      if (err.message.includes("ENOENT")) return; // Already deleted or no file
      console.warn("Error saving collection item: ", item.key);
      console.warn(err.stack);
      item.queue_save();
      return false;
    }
  }

  /**
   * Reads the `.ajson` file associated with the given item.
   * Uses `no_cache: true` to avoid caching issues.
   *
   * @private
   * @param {CollectionItem} item
   * @returns {Promise<string|null>} The raw AJSON string or null if empty.
   */
  async _read_item_file(item) {
    const data_ajson = (await this.fs.adapter.read(item.data_path, 'utf-8', { no_cache: true })).trim();
    return data_ajson || null;
  }

  /**
   * Ensures the AJSON string ends with a comma on each line.
   * If the last line does not have a trailing comma, add it.
   * This step provides backward compatibility with older files.
   *
   * @private
   * @param {string} data_ajson Raw AJSON data.
   * @returns {string} AJSON data with each line ending in a comma.
   */
  _ensure_trailing_commas(data_ajson) {
    if (!data_ajson.trim().endsWith(',')) {
      return data_ajson.split('\n').map(line => line.endsWith(',') ? line : line + ',').join('\n');
    }
    return data_ajson;
  }

  /**
   * Parses the raw AJSON string into a JS object by adding surrounding braces and using JSON.parse.
   *
   * @private
   * @param {string} data_ajson AJSON data with trailing commas ensured.
   * @returns {Object<string, any>} Parsed data as an object.
   */
  _parse_ajson_string_to_object(data_ajson) {
    // Remove last trailing comma before parsing as JSON
    const trimmed_data = data_ajson.slice(0, -1);
    return JSON.parse(`{${trimmed_data}}`);
  }

  /**
   * Processes parsed AJSON entries:
   * - Handles null/deleted entries
   * - Rebuilds an updated AJSON array if needed
   * - Loads item data
   *
   * @private
   * @param {Object<string,any>} parsed_data Parsed AJSON data
   * @param {CollectionItem} item Current item being loaded
   * @param {string[]} rebuilt_ajson Array reference to store reconstructed lines
   */
  _process_parsed_entries(parsed_data, item, rebuilt_ajson) {
    for (const [ajson_key, value] of Object.entries(parsed_data)) {
      if (!value) {
        // Skip null (deleted) entries
        continue;
      }

      // Build each line again for consistency
      rebuilt_ajson.push(`${JSON.stringify(ajson_key)}: ${JSON.stringify(value)},`);

      // Parse the AJSON key structure: ClassName:entity_key
      const [, ...key_parts] = ajson_key.split(":");
      const entity_key = key_parts.join(":"); // Remainder of string after class name

      if (entity_key === item.key) {
        // Assign data to the current item
        item.data = value;
      }
    }
  }
}
