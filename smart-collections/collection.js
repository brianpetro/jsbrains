import { CollectionItem } from './collection_item.js';
import { deep_merge } from './helpers.js';
import {render as render_settings_component} from "./components/settings.js";

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor; // for checking if function is async

/**
 * Base class representing a collection of items with various methods to manipulate and retrieve these items.
 * Provides core functionality for managing collections including CRUD operations, filtering, and settings management.
 * 
 * Key features:
 * - Maintains items in a flat key-instance structure for optimal performance
 * - Supports batch and queue processing patterns
 * - Handles collection-level data folder configuration
 * - Provides filtering and type detection capabilities
 * 
 * @see Smart Collection docs for detailed architecture and patterns
 */
export class Collection {
  /**
   * Constructs a new Collection instance.
   * @param {Object} env - The environment context containing configurations and adapters
   * @param {Object} [opts={}] - Optional configuration settings
   * @param {string} [opts.custom_collection_key] - Custom key to override default collection name
   * @param {string} [opts.data_dir] - Custom data directory path
   * @param {boolean} [opts.prevent_load_on_init] - Whether to prevent loading items during initialization
   */
  constructor(env, opts = {}) {
    this.env = env;
    this.opts = opts;
    if(opts.custom_collection_key) this.collection_key = opts.custom_collection_key;
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
   * Initializes a new collection in the environment.
   * @param {Object} env - The environment context
   * @param {Object} [opts={}] - Optional configuration settings
   * @returns {Promise<void>}
   */
  static async init(env, opts = {}) {
    env[this.collection_key] = new this(env, opts);
    await env[this.collection_key].init();
    env.collections[this.collection_key] = 'init';
  }

  /**
   * Gets the collection name derived from the class name.
   * Converts camelCase to snake_case.
   * @return {string} The collection name
   */
  static get collection_key() { return this.name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(); }

  // INSTANCE METHODS
  async init() {}

  /**
   * Creates or updates an item in the collection based on the provided data.
   * If an existing item is found, it updates it; otherwise, creates a new item.
   * @param {Object} [data={}] - The data to create or update an item with
   * @returns {Promise<CollectionItem>|CollectionItem} The created or updated item
   */
  create_or_update(data = {}) {
    const existing = this.find_by(data);
    const item = existing ? existing : new this.item_type(this.env);
    item._queue_save = !!!existing;
    const changed = item.update_data(data); // handles this.data
    if (!existing) {
      if (item.validate_save()) this.set(item); // make it available in collection (if valid)
      else {
        console.warn("Invalid item, skipping adding to collection: ", item);
        return item;
      }
    }
    if (existing && !changed) return existing; // if existing item and no changes, return existing item (no need to save)
    // dynamically handle async init functions
    if (item.init instanceof AsyncFunction) return new Promise((resolve, reject) => { item.init(data).then(() => resolve(item)); });
    item.init(data); // handles functions that involve other items
    return item;
  }

  /**
   * Finds an item in the collection that matches the given data.
   * First checks for a key match, then creates a temporary item to find matches.
   * @param {Object} data - The data to match against
   * @returns {CollectionItem|null} The matching item or null if not found
   */
  find_by(data) {
    if(data.key) return this.get(data.key);
    const temp = new this.item_type(this.env);
    const temp_data = JSON.parse(JSON.stringify(data, temp.sanitize_data(data)));
    deep_merge(temp.data, temp_data); // deep merge data
    return temp.key ? this.get(temp.key) : null;
  }
  // READ
  /**
   * Filters items in the collection based on provided options.
   * @param {Object|Function} [filter_opts={}] - Filter options to apply
   * @param {number} [filter_opts.limit] - Maximum number of items to return
   * @returns {CollectionItem[]} Array of filtered items
   */
  filter(filter_opts={}) {
    // handle function filters
    if(typeof filter_opts === 'function'){
      return Object.values(this.items).filter(filter_opts);
    }
    this.filter_opts = this.prepare_filter(filter_opts);
    const results = [];
    const { limit } = this.filter_opts;
    for (const item of Object.values(this.items)) {
      if (limit && results.length >= limit) break;
      if (item.filter(filter_opts)) {
        results.push(item);
      }
    }
    return results;
  }
  // alias for filter
  list(filter_opts) { return this.filter(filter_opts); }

  /**
   * Prepares filter options for use in the filter implementation.
   * Used by sub-classes to convert simplified filter options into filter_opts compatible with the filter implementation.
   * @param {Object} filter_opts - The original filter options provided.
   * @returns {Object} The prepared filter options compatible with the filter implementation.
   */
  prepare_filter(filter_opts) { return filter_opts; }
  /**
   * Retrieves a single item from the collection based on the provided strategy and options.
   * @param {String} key - The key of the item to retrieve.
   * @return {CollectionItem} The retrieved item.
   */
  get(key) { return this.items[key]; }
  /**
   * Retrieves multiple items from the collection based on the provided keys.
   * @param {String[]} keys - The keys of the items to retrieve.
   * @return {CollectionItem[]} The retrieved items.
   */
  get_many(keys = []) {
    if (Array.isArray(keys)) return keys.map((key) => this.get(key)).filter(Boolean);
    console.error("get_many called with non-array keys: ", keys);
  }
  /**
   * Retrieves a random item from the collection based on the provided options.
   * @param {Object} opts - The options used to retrieve the item.
   * @return {CollectionItem} The retrieved item.
   */
  get_rand(opts = null) {
    if (opts) {
      const filtered = this.filter(opts);
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
    return this.items[this.keys[Math.floor(Math.random() * this.keys.length)]];
  }
  // UPDATE
  /**
   * Adds or updates an item in the collection.
   * @param {CollectionItem} item - The item to add or update.
   */
  set(item) {
    if (!item.key) throw new Error("Item must have key property");
    this.items[item.key] = item;
  }
  /**
   * Updates multiple items in the collection based on the provided keys and data.
   * @param {String[]} keys - The keys of the items to update.
   * @param {Object} data - The data to update the items with.
   */
  update_many(keys = [], data = {}) { this.get_many(keys).forEach((item) => item.update_data(data)); }
  // DESTROY
  /**
   * Clears all items from the collection.
   */
  clear() {
    this.items = {};
  }
  /**
   * Deletes an item from the collection based on its key.
   * Does not trigger save or delete from adapter data.
   * @param {String} key - The key of the item to delete.
   */
  delete_item(key) {
    delete this.items[key];
  }
  /**
   * Deletes multiple items from the collection based on their keys.
   * @param {String[]} keys - The keys of the items to delete.
   */
  delete_many(keys = []) {
    // keys.forEach((key) => delete this.items[key]);
    keys.forEach((key) => {
      this.items[key].delete();
    });
  }
  // CONVENIENCE METHODS (namespace getters)
  /**
   * Gets or sets the collection name. If a name is set, it overrides the default name.
   * @param {String} name - The new collection name.
   */
  get collection_key() { return (this._collection_key) ? this._collection_key : this.constructor.collection_key; }
  set collection_key(name) { this._collection_key = name; }

  // DATA ADAPTER
  /**
   * Gets the data adapter instance for this collection.
   * Lazily initializes the adapter based on configuration.
   * @returns {DataAdapter} The data adapter instance for this collection
   * @throws {Error} If no data adapter class is found in configuration
   */
  get data_adapter() {
    if(!this._data_adapter){
      const config = this.env.opts.collections?.[this.collection_key];
      const data_adapter_class = config?.data_adapter
        ?? this.env.opts.collections?.smart_collections?.data_adapter
      ;
      if(!data_adapter_class) throw new Error("No data adapter class found for " + this.collection_key + " or smart_collections");
      this._data_adapter = new data_adapter_class(this);
    }
    return this._data_adapter;
  }

  /**
   * Gets the data directory strategy for this collection.
   * Default is 'multi' for multi-file storage.
   * @returns {string} The data directory strategy
   */
  get data_dir() { return 'multi'; }

  /**
   * Gets the filesystem adapter from the environment.
   * @returns {FileSystem} The filesystem adapter
   */
  get data_fs() { return this.env.data_fs; }

  /**
   * Gets the class name of the item type the collection manages.
   * @return {String} The item class name.
   */
  get item_class_name() {
    const name = this.constructor.name;
    if (name.endsWith('ies')) return name.slice(0, -3) + 'y'; // Entities -> Entity
    else if (name.endsWith('s')) return name.slice(0, -1); // Sources -> Source
    else return name + "Item"; // Collection -> CollectionItem
  }

  /**
   * Gets the name of the item type the collection manages, derived from the class name.
   * @return {String} The item name.
   */
  get item_name() { return this.item_class_name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(); }

  /**
   * Gets the constructor of the item type the collection manages.
   * @return {Function} The item type constructor.
   */
  get item_type() { return this.env.item_types[this.item_class_name]; }

  /**
   * Gets the keys of the items in the collection.
   * @return {String[]} The keys of the items.
   */
  get keys() { return Object.keys(this.items); }

  /**
   * @deprecated use data_adapter instead (2024-09-14)
   */
  get adapter(){ return this.data_adapter; }
  /**
   * Gets the data path from the environment.
   * @deprecated use env.env_data_dir
   * @returns {string} The data path.
   */
  get data_path() { return this.env.data_path; } // DEPRECATED
  // ADAPTER METHODS
  /**
   * Saves the current state of the collection.
   */
  async save() { await this.data_adapter.save(); }
  async save_queue() { await this.process_save_queue(); }

  // UTILITY METHODS
  /**
   * Merges default configurations from all classes in the inheritance chain for Collection types; 
   * e.g. EntityCollection, NoteCollection, etc.
   */
  merge_defaults() {
    let current_class = this.constructor;
    while (current_class) { // merge collection config into item config
      const col_conf = this.config?.collections?.[current_class.collection_key];
      Object.entries((typeof col_conf === 'object') ? col_conf : {})
        .forEach(([key, value]) => this[key] = value)
      ;
      current_class = Object.getPrototypeOf(current_class);
    }
  }
  /**
   * Processes the save queue for all items marked for saving.
   * Shows a notification during the save process.
   * @returns {Promise<void>}
   */
  async process_save_queue(overwrite = false) {
    this.notices?.show('saving', "Saving " + this.collection_key + "...", { timeout: 0 });
    if(this._saving) return console.log("Already saving");
    this._saving = true;
    setTimeout(() => { this._saving = false; }, 10000); // set _saving to false after 10 seconds
    const save_queue = Object.values(this.items).filter(item => item._queue_save);
    console.log("Saving " + this.collection_key + ": ", save_queue.length + " items");
    const time_start = Date.now();
    if(overwrite) await Promise.all(save_queue.map(item => item.overwrite_saved_data()));
    else await Promise.all(save_queue.map(item => item.save()));
    console.log("Saved " + this.collection_key + " in " + (Date.now() - time_start) + "ms");
    this._saving = false;
    this.notices?.remove('saving');
  }
  /**
   * Processes the load queue for all items marked for loading.
   * Loads items in batches for better performance.
   * Shows a notification during the load process.
   * @returns {Promise<void>}
   */
  async process_load_queue() {
    this.notices?.show('loading', "Loading " + this.collection_key + "...", { timeout: 0 });
    if(this._loading) return console.log("Already loading");
    this._loading = true;
    setTimeout(() => { this._loading = false; }, 10000); // set _loading to false after 10 seconds
    const load_queue = Object.values(this.items).filter(item => item._queue_load);
    console.log("Loading " + this.collection_key + ": ", load_queue.length + " items");
    const time_start = Date.now();
    const batch_size = 100;
    for (let i = 0; i < load_queue.length; i += batch_size) {
      const batch = load_queue.slice(i, i + batch_size);
      await Promise.all(batch.map(item => item.load()));
    }
    this.env.collections[this.collection_key] = 'loaded';
    this.load_time_ms = Date.now() - time_start;
    console.log("Loaded " + this.collection_key + " in " + this.load_time_ms + "ms");
    this._loading = false;
    this.loaded = load_queue.length;
    this.notices?.remove('loading');
  }
  get settings_config() { return this.process_settings_config({}); }
  process_settings_config(_settings_config, prefix = '') {
    const add_prefix = (key) =>
      prefix && !key.includes(`${prefix}.`) ? `${prefix}.${key}` : key;

    return Object.entries(_settings_config).reduce((acc, [key, val]) => {
      // Create a shallow copy to avoid mutating the original _settings_config
      let new_val = { ...val };

      if (new_val.conditional) {
        if (!new_val.conditional(this)) return acc;
        delete new_val.conditional; // Remove conditional to prevent re-checking downstream
      }

      if (new_val.callback) {
        new_val.callback = add_prefix(new_val.callback);
      }

      if (new_val.btn_callback) {
        new_val.btn_callback = add_prefix(new_val.btn_callback);
      }

      if (new_val.options_callback) {
        new_val.options_callback = add_prefix(new_val.options_callback);
      }

      const new_key = add_prefix(this.process_setting_key(key));
      acc[new_key] = new_val;
      return acc;
    }, {});
  }
  process_setting_key(key) { return key; } // override in sub-class if needed for prefixes and variable replacements
  /**
   * Gets the default settings for this collection.
   * Override in subclasses to provide collection-specific defaults.
   * @returns {Object} The default settings object
   */
  get default_settings() { return {}; }
  /**
   * Gets the current settings for this collection.
   * Initializes with default settings if none exist.
   * @returns {Object} The current settings object
   */
  get settings() {
    if(!this.env.settings[this.collection_key]){
      this.env.settings[this.collection_key] = this.default_settings;
    }
    return this.env.settings[this.collection_key];
  }
  /**
   * Gets the smart view instance from the environment.
   * Lazily initializes if not already created.
   * @deprecated use env.smart_view instead
   * @returns {SmartView} The smart view instance
   */
  get smart_view() {
    if(!this._smart_view) this._smart_view = this.env.init_module('smart_view');
    return this._smart_view;
  }
  /**
   * Renders the settings for the collection.
   * @param {HTMLElement} container - The container element to render the settings into.
   * @param {Object} opts - Additional options for rendering.
   * @param {Object} opts.settings_keys - An array of keys to render.
   */
  async render_settings(container=this.settings_container, opts = {}) {
    return await this.render_collection_settings(container, opts);
  }
  async render_collection_settings(container=this.settings_container, opts = {}) {
    if(container && (!this.settings_container || this.settings_container !== container)) this.settings_container = container;
    else if(!container){
      console.log('no container, creating frag');
      container = this.env.smart_view.create_doc_dragment('<div></div>') // if still no container input or store, create container frag
    }
    container.innerHTML = `<div class="sc-loading">Loading ${this.collection_key} settings...</div>`;
    const frag = await this.env.render_component('settings', this, opts);
    container.innerHTML = '';
    container.appendChild(frag);
    return container;
  }

  unload() {
    this.clear();
  }
  async run_load() {
    this.loaded = null;
    this.load_time_ms = null;
    Object.values(this.items).forEach((item) => item.queue_load());
    this.notices?.show(`loading ${this.collection_key}`, `Loading ${this.collection_key}...`, { timeout: 0 });
    await this.process_load_queue();
    this.notices?.remove(`loading ${this.collection_key}`);
    this.notices?.show('done loading', `${this.collection_key} loaded`, { timeout: 3000 });
    this.render_settings(); // re-render settings
  }

}