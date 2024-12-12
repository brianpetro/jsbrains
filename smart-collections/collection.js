import { deep_merge } from './utils/helpers.js';

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

/**
 * @class Collection
 *
 * The `Collection` class represents a group of `CollectionItem` instances. It provides:
 * - CRUD operations (create, update, delete) for items
 * - Filtering and listing items
 * - Loading and saving items via a data adapter
 * - Rendering collection-level settings
 *
 * **Key Features:**
 * - Maintains items in a flat key-to-instance structure for performance
 * - Batch and queue processing for load/save operations
 * - Data-driven configuration from environment
 * - Supports filtering by various item key patterns
 * - Supports rendering settings and using components pattern for UI
 */
export class Collection {
  /**
   * Constructs a new Collection instance.
   *
   * @param {Object} env - The environment context containing configurations and adapters.
   * @param {Object} [opts={}] - Optional configuration.
   * @param {string} [opts.custom_collection_key] - Custom key to override default collection name.
   * @param {string} [opts.data_dir] - Custom data directory path.
   * @param {boolean} [opts.prevent_load_on_init] - Whether to prevent loading items on initialization.
   */
  constructor(env, opts = {}) {
    this.env = env;
    this.opts = opts;
    if (opts.custom_collection_key) this.collection_key = opts.custom_collection_key;
    this.env[this.collection_key] = this;
    this.config = this.env.config;
    this.items = {};
    this.merge_defaults();
    this.loaded = null;
    this._loading = false;
    this.load_time_ms = null;
    this.settings_container = null;
  }

  /**
   * Initializes a new collection in the environment. Override in subclass if needed.
   *
   * @param {Object} env
   * @param {Object} [opts={}]
   * @returns {Promise<void>}
   */
  static async init(env, opts = {}) {
    env[this.collection_key] = new this(env, opts);
    await env[this.collection_key].init();
    env.collections[this.collection_key] = 'init';
  }

  /**
   * The unique collection key derived from the class name.
   * @returns {string}
   */
  static get collection_key() {
    return this.name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  }

  /**
   * Instance-level init. Override in subclasses if necessary.
   * @returns {Promise<void>}
   */
  async init() {}

  /**
   * Creates or updates an item in the collection. If the item key exists, updates existing item data;
   * otherwise, creates a new item.
   *
   * @param {Object} [data={}] - Data for creating/updating an item.
   * @returns {Promise<Item>|Item} The created or updated item.
   */
  create_or_update(data = {}) {
    const existing = this.find_by(data);
    const item = existing ? existing : new this.item_type(this.env);
    item._queue_save = !existing; // If not existing, it must be saved.

    const changed = item.update_data(data); 
    if (!existing) {
      // Validate before adding to collection
      if (item.validate_save()) {
        this.set(item);
      } else {
        console.warn("Invalid item, skipping adding to collection:", item);
        return item;
      }
    }

    // If item is existing and data didn't change, no need to re-save.
    if (existing && !changed) return existing;

    // If `init` is async, handle asynchronously.
    if (item.init instanceof AsyncFunction) {
      return new Promise((resolve) => { 
        item.init(data).then(() => resolve(item)); 
      });
    }

    item.init(data);
    return item;
  }

  /**
   * Finds an item by partial data match (first checks key). If `data.key` provided,
   * returns the item with that key; otherwise attempts a match by merging data.
   *
   * @param {Object} data - Data to match against.
   * @returns {Item|null}
   */
  find_by(data) {
    if (data.key) return this.get(data.key);
    const temp = new this.item_type(this.env);
    const temp_data = JSON.parse(JSON.stringify(data, temp.sanitize_data(data)));
    deep_merge(temp.data, temp_data);
    return temp.key ? this.get(temp.key) : null;
  }

  /**
   * Filters items based on provided filter options or a custom function.
   *
   * @param {Object|Function} [filter_opts={}] - Filter options or a predicate function.
   * @returns {Item[]} Array of filtered items.
   */
  filter(filter_opts = {}) {
    if (typeof filter_opts === 'function') {
      return Object.values(this.items).filter(filter_opts);
    }
    this.filter_opts = this.prepare_filter(filter_opts);

    const results = [];
    const { limit } = this.filter_opts;

    for (const item of Object.values(this.items)) {
      if (limit && results.length >= limit) break;
      if (item.filter(filter_opts)) results.push(item);
    }
    return results;
  }

  /**
   * Alias for `filter()`
   * @param {Object|Function} filter_opts
   * @returns {Item[]}
   */
  list(filter_opts) { return this.filter(filter_opts); }

  /**
   * Prepares filter options. Can be overridden by subclasses to normalize filter options.
   *
   * @param {Object} filter_opts
   * @returns {Object} Prepared filter options.
   */
  prepare_filter(filter_opts) { return filter_opts; }

  /**
   * Retrieves an item by key.
   * @param {string} key
   * @returns {Item|undefined}
   */
  get(key) { return this.items[key]; }

  /**
   * Retrieves multiple items by an array of keys.
   * @param {string[]} keys
   * @returns {Item[]}
   */
  get_many(keys = []) {
    if (!Array.isArray(keys)) {
      console.error("get_many called with non-array keys:", keys);
      return [];
    }
    return keys.map((key) => this.get(key)).filter(Boolean);
  }

  /**
   * Retrieves a random item from the collection, optionally filtered by options.
   * @param {Object} [opts]
   * @returns {Item|undefined}
   */
  get_rand(opts = null) {
    if (opts) {
      const filtered = this.filter(opts);
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
    const keys = this.keys;
    return this.items[keys[Math.floor(Math.random() * keys.length)]];
  }

  /**
   * Adds or updates an item in the collection.
   * @param {Item} item
   */
  set(item) {
    if (!item.key) throw new Error("Item must have a key property");
    this.items[item.key] = item;
  }

  /**
   * Updates multiple items by their keys.
   * @param {string[]} keys
   * @param {Object} data
   */
  update_many(keys = [], data = {}) {
    this.get_many(keys).forEach((item) => item.update_data(data));
  }

  /**
   * Clears all items from the collection.
   */
  clear() {
    this.items = {};
  }

  /**
   * Deletes an item by key from the collection (does not save deletion, just removes from memory).
   * @param {string} key
   */
  delete_item(key) {
    delete this.items[key];
  }

  /**
   * Deletes multiple items by their keys. Internally calls `item.delete()` which queues a save.
   * @param {string[]} keys
   */
  delete_many(keys = []) {
    keys.forEach((key) => {
      if (this.items[key]) this.items[key].delete();
    });
  }

  /**
   * @returns {string} The collection key, can be overridden by opts.custom_collection_key
   */
  get collection_key() {
    return this._collection_key ? this._collection_key : this.constructor.collection_key;
  }

  set collection_key(name) { this._collection_key = name; }

  /**
   * Lazily initializes and returns the data adapter instance for this collection.
   * @returns {Object} The data adapter instance.
   */
  get data_adapter() {
    if (!this._data_adapter) {
      const config = this.env.opts.collections?.[this.collection_key];
      const data_adapter_class = config?.data_adapter
        ?? this.env.opts.collections?.smart_collections?.data_adapter;
      if (!data_adapter_class) {
        throw new Error(`No data adapter class found for ${this.collection_key} or smart_collections`);
      }
      this._data_adapter = new data_adapter_class(this);
    }
    return this._data_adapter;
  }

  /**
   * Data directory strategy for this collection. Defaults to 'multi'.
   * @returns {string}
   */
  get data_dir() { return 'multi'; }

  /**
   * File system adapter from the environment.
   * @returns {Object}
   */
  get data_fs() { return this.env.data_fs; }

  /**
   * Derives the corresponding item class name based on this collection's class name.
   * @returns {string}
   */
  get item_class_name() {
    const name = this.constructor.name;
    if (name.endsWith('ies')) return name.slice(0, -3) + 'y'; 
    else if (name.endsWith('s')) return name.slice(0, -1);
    return name + "Item";
  }

  /**
   * Derives a readable item name from the item class name.
   * @returns {string}
   */
  get item_name() {
    return this.item_class_name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  }

  /**
   * Retrieves the item type (constructor) from the environment.
   * @returns {Function} Item constructor.
   */
  get item_type() { return this.env.item_types[this.item_class_name]; }

  /**
   * Returns an array of all keys in the collection.
   * @returns {string[]}
   */
  get keys() { return Object.keys(this.items); }

  /**
   * @deprecated use data_adapter instead (2024-09-14)
   */
  get adapter() { return this.data_adapter; }

  /**
   * @deprecated Use env.env_data_dir
   * @returns {string}
   */
  get data_path() { return this.env.data_path; }

  /**
   * Saves the current state of the collection.
   * @returns {Promise<void>}
   */
  async save() { await this.data_adapter.save_all_items(); }

  /**
   * Processes all items queued for saving.
   * @returns {Promise<void>}
   */
  async save_queue() { await this.process_save_queue(); }

  /**
   * Merges default configurations from class inheritance chain into this collection.
   * Override or extend if needed.
   * @private
   */
  merge_defaults() {
    let current_class = this.constructor;
    while (current_class) {
      const col_conf = this.config?.collections?.[current_class.collection_key];
      if (typeof col_conf === 'object') {
        Object.entries(col_conf).forEach(([key, value]) => this[key] = value);
      }
      current_class = Object.getPrototypeOf(current_class);
    }
  }

  
  /**
   * @method process_save_queue
   * @description 
   * Saves items flagged for saving (_queue_save) back to AJSON or SQLite. This ensures persistent storage 
   * of any updates made since last load/import. This method also writes changes to disk (AJSON files or DB).
   */
  async process_save_queue() {
    // Just delegate to the adapter
    await this.data_adapter.process_save_queue();
  }

  /**
   * @method process_load_queue
   * @description 
   * Loads items that have been flagged for loading (_queue_load). This may involve 
   * reading from AJSON/SQLite or re-importing from markdown if needed. 
   * Called once initial environment is ready and collections are known.
   */
  async process_load_queue() {
    // Just delegate to the adapter
    await this.data_adapter.process_load_queue();
  }

  /**
   * Retrieves processed settings configuration.
   * @returns {Object}
   */
  get settings_config() { return this.process_settings_config({}); }

  /**
   * Processes given settings config, adding prefixes and handling conditionals.
   *
   * @private
   * @param {Object} _settings_config
   * @param {string} [prefix='']
   * @returns {Object}
   */
  process_settings_config(_settings_config, prefix = '') {
    const add_prefix = (key) =>
      prefix && !key.includes(`${prefix}.`) ? `${prefix}.${key}` : key;

    return Object.entries(_settings_config).reduce((acc, [key, val]) => {
      let new_val = { ...val };

      if (new_val.conditional) {
        if (!new_val.conditional(this)) return acc;
        delete new_val.conditional;
      }

      if (new_val.callback) new_val.callback = add_prefix(new_val.callback);
      if (new_val.btn_callback) new_val.btn_callback = add_prefix(new_val.btn_callback);
      if (new_val.options_callback) new_val.options_callback = add_prefix(new_val.options_callback);

      const new_key = add_prefix(this.process_setting_key(key));
      acc[new_key] = new_val;
      return acc;
    }, {});
  }

  /**
   * Processes an individual setting key. Override if needed.
   * @param {string} key
   * @returns {string}
   */
  process_setting_key(key) { return key; }

  /**
   * Default settings for this collection. Override in subclasses as needed.
   * @returns {Object}
   */
  get default_settings() { return {}; }

  /**
   * Current settings for the collection.
   * Initializes with default settings if none exist.
   * @returns {Object}
   */
  get settings() {
    if (!this.env.settings[this.collection_key]) {
      this.env.settings[this.collection_key] = this.default_settings;
    }
    return this.env.settings[this.collection_key];
  }

  /**
   * @deprecated use env.smart_view instead
   * @returns {Object} smart_view instance
   */
  get smart_view() {
    if(!this._smart_view) this._smart_view = this.env.init_module('smart_view');
    return this._smart_view;
  }

  /**
   * Renders the settings for the collection into a given container.
   * @param {HTMLElement} [container=this.settings_container]
   * @param {Object} opts
   * @returns {Promise<HTMLElement>}
   */
  async render_settings(container = this.settings_container, opts = {}) {
    return await this.render_collection_settings(container, opts);
  }

  /**
   * Helper function to render collection settings.
   * @param {HTMLElement} [container=this.settings_container]
   * @param {Object} opts
   * @returns {Promise<HTMLElement>}
   */
  async render_collection_settings(container = this.settings_container, opts = {}) {
    if (container && (!this.settings_container || this.settings_container !== container)) {
      this.settings_container = container;
    } else if (!container) {
      // NOTE: Creating a fragment if no container provided. This depends on `env.smart_view`.
      container = this.env.smart_view.create_doc_dragment('<div></div>');
    }
    container.innerHTML = `<div class="sc-loading">Loading ${this.collection_key} settings...</div>`;
    const frag = await this.env.render_component('settings', this, opts);
    container.innerHTML = '';
    container.appendChild(frag);
    return container;
  }

  /**
   * Unloads collection data from memory.
   */
  unload() {
    this.clear();
  }

  /**
   * Runs load process for all items in the collection, triggering queue loads and rendering settings after done.
   * @returns {Promise<void>}
   */
  async run_load() {
    this.loaded = null;
    this.load_time_ms = null;
    Object.values(this.items).forEach((item) => item.queue_load());
    this.notices?.show(`loading ${this.collection_key}`, `Loading ${this.collection_key}...`, { timeout: 0 });
    await this.process_load_queue();
    this.notices?.remove(`loading ${this.collection_key}`);
    this.notices?.show('done loading', `${this.collection_key} loaded`, { timeout: 3000 });
    this.render_settings();
  }
}

