import { CollectionItem } from './CollectionItem.js';
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
    // this.brain = this.env; // DEPRECATED: use env instead of brain
    this.config = this.env.config;
    this.items = {};
    this.opts = opts;
    if(this.opts.adapter_class) this.adapter = new opts.adapter_class(this);
    this.save_queue = {};
  }

  // STATIC METHODS
  /**
   * Loads a collection based on the environment and optional configuration.
   * @param {Object} env - The environment context.
   * @param {Object} [config={}] - Optional configuration for the collection.
   * @returns {Promise<Collection>|Collection} The loaded collection instance.
   */
  static load(env, opts = {}) {
    if(typeof opts.adapter_class?.load === 'function') return opts.adapter_class.load(env, opts);
    // if no static load method in adapter_class, load collection as normal
    const { custom_collection_name } = opts;
    env[this.collection_name] = new this(env, opts);
    if (custom_collection_name) {
      env[this.collection_name].collection_name = custom_collection_name;
      env.collections[custom_collection_name] = this.constructor;
    }
    env[this.collection_name].merge_defaults();
    // return promise if async
    if (env[this.collection_name].load instanceof AsyncFunction) return env[this.collection_name].load().then(() => env[this.collection_name]);
    else env[this.collection_name].load();
    return env[this.collection_name];
  }
  /**
   * Gets the collection name derived from the class name.
   * @return {String} The collection name.
   */
  static get collection_name() { return this.name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(); }

  // INSTANCE METHODS

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
   * @param {Object} opts - The options used to filter the items.
   * @return {CollectionItem[]} The filtered items.
   */
  list(opts) { return Object.entries(this.items).filter(([key, item]) => item.filter(opts)).map(([key, item]) => item); }
  filter(opts) { return this.list(opts); } // DEPRECATED: use list() instead
  /**
   * Retrieves items from the collection based on the provided strategy and options.
   * @param {Function[]} strategy - The strategy used to retrieve the items.
   * @param {Object} opts - The options used to retrieve the items.
   * @return {CollectionItem[]} The retrieved items.
   * @throws {Error} Throws an error if any function in the strategy array is not actually a function or if an async function throws an error.
   */
  async retrieve(strategy=[], opts={}) { return await sequential_async_processor(funcs, this.filter(opts), opts); }
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
   * @param {String} key - The key of the item to delete.
   */
  delete(key) {
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
  get item_class_name() { return this.constructor.name.slice(0, -1).replace(/(ie)$/g, 'y'); } // remove 's' from end of name & if name ends in 'ie', replace with 'y'
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
   * @returns {string} The data path.
   */
  get data_path() { return this.env.data_path + '/multi'; }

  // ADAPTER METHODS
  /**
   * Saves the current state of the collection.
   */
  async save() {
    if(typeof this.adapter?.save === 'function') await this.adapter.save();
    else console.warn("No save method found in adapter");
  }

  /**
   * Loads the collection state.
   */
  async load() {
    if(typeof this.adapter?.load === 'function') return await this.adapter.load();
    else console.warn("No load method found in adapter");
  }

  // BACKWARD COMPATIBILITY
  get LTM() { return this.adapter; }

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
}

/**
 * Sequentially executes an array of asynchronous functions, passing the result of each function
 * as the input to the next, along with an optional options object.
 * 
 * @param {Function[]} funcs - An array of functions to execute sequentially (may be async functions).
 * @param {*} initial_value - The initial value to pass to the first function in the array.
 * @param {Object} opts - Optional parameters to pass to each function.
 * @returns {*} The final value after all functions have been executed.
 * @throws {Error} Throws an error if any function in the array is not actually a function or if an async function throws an error.
 */
export async function sequential_async_processor(funcs, initial_value, opts = {}) {
  let value = initial_value;
  for (const func of funcs) {
    // Ensure each element is a function before attempting to call it
    if (typeof func !== 'function') {
      throw new TypeError('All elements in async_functions array must be functions');
    }
    try {
      value = await func(value, opts);
    } catch (error) {
      // console.error("Error encountered during sequential processing:", error);
      throw error; // Rethrow to halt execution, or handle differently if continuation is desired
    }
  }

  return value;
}