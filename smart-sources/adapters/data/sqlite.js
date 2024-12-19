import initSqlJs from 'sql.js';
import { SqliteCollectionDataAdapter } from 'smart-collections/adapters/sqlite.js';
/**
 * Maps collection class names to their corresponding collection keys.
 * Used to route data entries to the correct collection from the SQLite database.
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
 * Adapter for handling SQLite-based data storage for smart collections.
 * Utilizes sql.js to manage a SQLite database in memory and persist it to disk.
 *
 * Features:
 * - Stores collection items in a SQLite table with cross-collection references.
 * - Supports CRUD operations via SQL queries.
 * - Persists the database state to a file, ensuring data persistence across sessions.
 *
 * @extends {SmartCollectionDataAdapter}
 */
export class SqliteSourceDataAdapter extends SqliteCollectionDataAdapter {
  /**
   * Initializes the SQLite adapter by loading or creating the database.
   */
  constructor(collection) {
    super(collection);
    this.db = null;
    this.initialized = false;
    this.dbPath = this.collection.settings.sqlite_db_path || 'collection.sqlite';
    this.initPromise = this.initialize();
  }

  get fs() { return this.collection.data_fs || this.env.data_fs; }

  /**
   * Initializes the SQLite database and ensures the items table exists.
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Initialize sql.js
      const wasmBinary = await fetch(
        new URL('https://sql.js.org/dist/sql-wasm.wasm')
      ).then(res => res.arrayBuffer());
      const SQL = await initSqlJs({
        wasmBinary,
      });

      const fs = this.fs;
      if (await fs.exists(this.dbPath)) {
        // Load existing database file
        const binary = await fs.read(this.dbPath, 'binary');
        this.db = new SQL.Database(binary);
      } else {
        // Create a new database
        this.db = new SQL.Database();
        this._createTable();
        await this.save_to_disk();
      }

      this._createTable(); // Ensure table exists
      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize SQLite adapter:', err);
      throw err;
    }
  }

  /**
   * Creates the items table with additional columns for cross-collection references
   * @private
   */
  _createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS items (
        key TEXT PRIMARY KEY,
        class_name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `;
    this.db.run(createTableSQL);
  }

  /**
   * Loads data for a collection item from the SQLite database.
   *
   * @param {CollectionItem} item - The collection item to load.
   * @returns {Promise<void>}
   */
  async load(item) {
    await this.initPromise;

    try {
      const stmt = this.db.prepare('SELECT class_name, data FROM items WHERE key = :key');
      stmt.bind({ ':key': item.key });

      if (stmt.step()) {
        const row = stmt.getAsObject();
        const data = JSON.parse(row.data);
        
        // Assign data to the current item
        item.data = data;
        item._queue_load = false;
        item.loaded_at = Date.now();
      } else {
        console.log(`Data not found for: ${item.key}`);
        item.queue_import(); // Queue import if no data found
      }

      stmt.free();
    } catch (err) {
      console.warn(`Error loading collection item: ${item.key}`, err);
      item.queue_load();
    }
  }

  /**
   * Saves data for a collection item to the SQLite database.
   *
   * @param {CollectionItem} item - The collection item to save.
   * @param {string|null} [ajson=null] - Custom AJSON string. Defaults to item.ajson if not provided.
   * @returns {Promise<boolean>} - True if save was successful, false otherwise.
   */
  async save(item, ajson = null) {
    await this.initPromise;

    if (!ajson) ajson = item.ajson;

    try {
      if (item.deleted) {
        // Delete the item from the database
        this.db.run('DELETE FROM items WHERE key = :key', { ':key': item.key });
        this.collection.delete_item(item.key);
      } else {
        // Fix: Use just the constructor name without the key
        const class_name = item.constructor.name;

        // Insert or replace the item in the database
        this.db.run(
          `INSERT OR REPLACE INTO items (key, class_name, data, updated_at) 
           VALUES (:key, :class_name, :data, strftime('%s', 'now'))`,
          { 
            ':key': item.key, 
            ':class_name': class_name,
            ':data': JSON.stringify(item.data) 
          }
        );
      }

      item._queue_save = false;
      await this.save_to_disk();
      return true;
    } catch (err) {
      console.warn(`Error saving collection item: ${item.key}`, err);
      item.queue_save();
      return false;
    }
  }

  /**
   * Saves the in-memory SQLite database to the disk.
   *
   * @returns {Promise<void>}
   */
  async save_to_disk() {
    try {
      const binary = this.db.export();
      const buffer = new Uint8Array(binary);
      await this.fs.write(this.dbPath, buffer, 'binary');
    } catch (err) {
      console.error('Failed to save SQLite database to disk:', err);
      throw err;
    }
  }

  /**
   * Loads all items from the SQLite database into the collection.
   *
   * @returns {Promise<void>}
   */
  async load_all_items() {
    await this.initPromise;

    try {
      const stmt = this.db.prepare('SELECT key, class_name, data FROM items');
      while (stmt.step()) {
        const row = stmt.getAsObject();
        const key = row.key;
        const class_name = row.class_name;  // Now just the class name
        const data = JSON.parse(row.data);

        // Get target collection based on class name only
        const target_collection_key = class_to_collection_key[class_name];
        if (!target_collection_key) {
          console.warn(`Unknown class name: ${class_name}. Item ${key} skipped.`);
          continue;
        }

        const target_collection = this.env[target_collection_key];
        if (!target_collection) {
          console.warn(`Target collection not found: ${target_collection_key}. Item ${key} skipped.`);
          continue;
        }

        // Create or update item
        let item = target_collection.get(key);
        if (!item) {
          const ItemType = target_collection.item_type;
          item = new ItemType(this.env, data);
          item.key = key;
          target_collection.set(item);
        } else {
          item.data = data;
        }

        item._queue_load = false;
        item.loaded_at = Date.now();
      }
      stmt.free();
    } catch (err) {
      console.error('Failed to load all items from SQLite database:', err);
      throw err;
    }
  }

  /**
   * Processes parsed entries to handle cross-collection loading.
   *
   * @private
   * @param {string} type_name - The class name without the key.
   * @param {Object} data - The data object of the item.
   * @param {CollectionItem} current_item - The current item being loaded.
   */
  _process_parsed_entries(type_name, data, current_item) {
    // Iterate over each key in the data to find cross-collection references
    for (const [field, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.includes(':')) {
        // Assume the format ClassName:key for references
        const [ref_class_name, ref_key] = value.split(':');
        const target_collection_key = class_to_collection_key[ref_class_name];
        if (target_collection_key && this.env[target_collection_key]) {
          const target_collection = this.env[target_collection_key];
          if (!target_collection.get(ref_key)) {
            // Placeholder for the referenced item; actual data should be loaded separately
            const ItemType = target_collection.item_type;
            const placeholder_item = new ItemType(this.env, { key: ref_key });
            placeholder_item._queue_load = true; // Mark for loading
            target_collection.set(placeholder_item);
          }
        }
      }
    }
  }
}

export default {
  collection: SqliteSourceDataAdapter,
  item: SqliteSourceDataAdapter
};
