import initSqlJs from 'sql.js';
import { SmartCollectionDataAdapter } from './_adapter.js';

/**
 * Adapter for handling SQLite-based data storage for smart collections.
 * Utilizes sql.js to manage a SQLite database in memory and persist it to disk.
 *
 * Features:
 * - Stores collection items in a SQLite table.
 * - Supports CRUD operations via SQL queries.
 * - Persists the database state to a file, ensuring data persistence across sessions.
 *
 * @extends {SmartCollectionDataAdapter}
 */
export class SqliteCollectionDataAdapter extends SmartCollectionDataAdapter {
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
   * Creates the items table if it does not exist.
   */
  _createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS items (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL
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
      const stmt = this.db.prepare('SELECT data FROM items WHERE key = :key');
      stmt.bind({ ':key': item.key });

      if (stmt.step()) {
        const row = stmt.getAsObject();
        item.data = JSON.parse(row.data);
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
        // Insert or replace the item in the database
        this.db.run(
          'INSERT OR REPLACE INTO items (key, data) VALUES (:key, :data)',
          { ':key': item.key, ':data': JSON.stringify(item.data) }
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
      const stmt = this.db.prepare('SELECT key, data FROM items');
      while (stmt.step()) {
        const row = stmt.getAsObject();
        const key = row.key;
        const data = JSON.parse(row.data);
        const item = this.collection.get(key) || new this.collection.item_type(this.collection.env, data);
        item.data = data;
        item._queue_load = false;
        item.loaded_at = Date.now();
        this.collection.set(item);
      }
      stmt.free();
    } catch (err) {
      console.error('Failed to load all items from SQLite database:', err);
      throw err;
    }
  }
}
