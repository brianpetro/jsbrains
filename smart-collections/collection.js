import { CollectionItem } from './collection_item.js';
import { deep_merge } from './helpers.js';

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor; // for checking if function is async

/**
 * Base class representing a collection of items with various methods to manipulate and retrieve these items.
 */
export class Collection {
  /**
   * Constructs a new Collection instance.
   * @param {Object} env - The environment context containing configurations and adapters.
   */
  constructor(env, opts = {}) {
    this.env = env;
    this.opts = opts;
    if(opts.custom_collection_name) this.collection_name = opts.custom_collection_name;
    this.env[this.collection_name] = this;
    this.config = this.env.config;
    this.items = {};
    if (this.opts.smart_collection_adapter_class) this.adapter = new this.opts.smart_collection_adapter_class(this);
    else if(this.opts.adapter_class) this.adapter = new opts.adapter_class(this); // DEPRECATED: use smart_collection_adapter_class instead
    this.merge_defaults();
    this.filter_results_ct = 0;
  }
  static async init(env, opts = {}) {
    env[this.collection_name] = new this(env, opts);
    await env[this.collection_name].init();
  }

  /**
   * Gets the collection name derived from the class name.
   * @return {String} The collection name.
   */
  static get collection_name() { return this.name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(); }

  // INSTANCE METHODS
  async init() {}

  /**
   * Creates or updates an item in the collection based on the provided data.
   * @param {Object} data - The data to create or update an item.
   * @returns {Promise<CollectionItem>|CollectionItem} The newly created or updated item.
   */
  create_or_update(data = {}) {
    const existing = this.find_by(data);
    const item = existing ? existing : new this.item_type(this.env);
    item.is_new = !!!existing;
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
   * @param {Object} data - The criteria used to find the item.
   * @returns {CollectionItem|null} The found item or null if not found.
   */
  find_by(data) {
    if(data.key) return this.get(data.key);
    const temp = new this.item_type(this.env);
    const temp_data = JSON.parse(JSON.stringify(data, temp.update_data_replacer));
    deep_merge(temp.data, temp_data); // deep merge data
    return temp.key ? this.get(temp.key) : null;
  }
  // READ
  /**
   * Filters the items in the collection based on the provided options.
   * @param {Object} filter_opts - The options used to filter the items.
   * @return {CollectionItem[]} The filtered items.
   */
  filter(filter_opts={}) {
    this.filter_results_ct = 0;
    this.filter_opts = this.prepare_filter(filter_opts);
    const results = Object.entries(this.items).map(([key, item]) => {
      if(filter_opts.limit && this.filter_results_ct >= filter_opts.limit) return null;
      if(item.filter(this.filter_opts)){
        this.filter_results_ct++;
        return item;
      } else return null;
    }).filter(Boolean);
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
    if (Array.isArray(keys)) return keys.map((key) => this.get(key));
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
  get collection_name() { return (this._collection_name) ? this._collection_name : this.constructor.collection_name; }
  set collection_name(name) { this._collection_name = name; }
  /**
   * Gets the keys of the items in the collection.
   * @return {String[]} The keys of the items.
   */
  get keys() { return Object.keys(this.items); }
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
   * Gets the data path from the environment.
   * @deprecated use env.settings.env_data_dir
   * @returns {string} The data path.
   */
  get data_path() { return this.env.data_path; } // DEPRECATED

  // may be moved to SmartSources (should not be needed in this or SmartEntities)
  get fs() { return this.env.fs; }

  // ADAPTER METHODS
  /**
   * Saves the current state of the collection.
   */
  async save() { await this.adapter.save(); }
  async save_queue() { await this.process_save_queue(); }

  // UTILITY METHODS
  /**
   * Merges default configurations from all classes in the inheritance chain for Collection types; 
   * e.g. EntityCollection, NoteCollection, etc.
   */
  merge_defaults() {
    let current_class = this.constructor;
    while (current_class) { // merge collection config into item config
      const col_conf = this.config?.collections?.[current_class.collection_name];
      Object.entries((typeof col_conf === 'object') ? col_conf : {})
        .forEach(([key, value]) => this[key] = value)
      ;
      current_class = Object.getPrototypeOf(current_class);
    }
  }
  async process_save_queue() {
    this.notices?.show('saving', "Saving " + this.collection_name + "...", { timeout: 0 });
    if(this._saving) return console.log("Already saving");
    this._saving = true;
    setTimeout(() => { this._saving = false; }, 10000); // set _saving to false after 10 seconds
    const save_queue = Object.values(this.items).filter(item => item._queue_save);
    console.log("Saving " + this.collection_name + ": ", save_queue.length + " items");
    const time_start = Date.now();
    await Promise.all(save_queue.map(item => item.save()));
    console.log("Saved " + this.collection_name + " in " + (Date.now() - time_start) + "ms");
    this._saving = false;
    this.notices?.remove('saving');
  }
  async process_load_queue() {
    this.notices?.show('loading', "Loading " + this.collection_name + "...", { timeout: 0 });
    if(this._loading) return console.log("Already loading");
    this._loading = true;
    setTimeout(() => { this._loading = false; }, 10000); // set _loading to false after 10 seconds
    const load_queue = Object.values(this.items).filter(item => item._queue_load);
    console.log("Loading " + this.collection_name + ": ", load_queue.length + " items");
    const time_start = Date.now();
    // await Promise.all(load_queue.map(item => item.load()));
    const chunk_size = 100;
    for (let i = 0; i < load_queue.length; i += chunk_size) {
        const chunk = load_queue.slice(i, i + chunk_size);
        await Promise.all(chunk.map(item => item.load()));
        // console.log(`Loaded ${i + chunk.length} / ${load_queue.length} items`);
    }
    console.log("Loaded " + this.collection_name + " in " + (Date.now() - time_start) + "ms");
    this._loading = false;
    this.loaded = true;
    this.notices?.remove('loading');
  }
  get settings_config() { return {}; }
  get settings_html() {
    return Object.entries(this.settings_config).map(([setting_name, setting_config]) => {
      return this.get_setting_html(setting_name, setting_config);
    }).join('\n');
  }
  get_setting_html(setting_name, setting_config) {
    if(setting_config.conditional && !setting_config.conditional(this)) return "";
    const attributes = Object.entries(setting_config)
      .map(([attr, value]) => `data-${attr.replace(/_/g, '-')}="${value}"`)
      .join('\n')
    ;
    return `<div class="setting-component"\ndata-setting="${this.collection_name}.${setting_name}"\n${attributes}\n></div>`;
  }
}