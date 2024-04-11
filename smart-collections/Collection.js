const { CollectionItem } = require('./CollectionItem');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor; // for checking if function is async
const helpers = require('./helpers');
const {
  deep_merge,
} = helpers;

// BASE COLLECTION CLASSES
/**
 * Represents a collection of items.
 */
class Collection {
  constructor(env) {
    this.env = env;
    this.brain = this.env; // DEPRECATED: use env instead of brain
    this.config = this.env.config;
    this.items = {};
    // this.keys = []; // replaced by getter
    this.LTM = this.env.ltm_adapter.wake_up(this, this.env.ltm_adapter);
  }
  static load(env, config = {}) {
    const { custom_collection_name } = config;
    env[this.collection_name] = new this(env);
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
  // Merge defaults from all classes in the inheritance chain (from top to bottom, so child classes override parent classes)
  merge_defaults() {
    let current_class = this.constructor;
    while (current_class) { // merge collection config into item config
      const col_conf = this.config?.collections?.[current_class.collection_name];
      Object.entries((typeof col_conf === 'object') ? col_conf : {})
        .forEach(([key, value]) => this[key] = value)
      ;
      current_class = Object.getPrototypeOf(current_class);
    }
    // console.log(Object.keys(this));
  }
  // SAVE/LOAD
  save() { this.LTM.save(); }
  load() { this.LTM.load(); }
  reviver(key, value) {
    if (typeof value !== 'object' || value === null) return value; // skip non-objects, quick return
    if (value.class_name) return new (this.env.item_types[value.class_name])(this.env, value);
    return value;
  }
  // reviver(key, value) { // JSON.parse reviver
  //   if(typeof value !== 'object' || value === null) return value; // skip non-objects, quick return
  //   if(value.class_name) this.items[key] = new (this.env.item_types[value.class_name])(this.env, value);
  //   return null;
  // }
  replacer(key, value) {
    if (value instanceof this.item_type) return value.data;
    if (value instanceof CollectionItem) return value.ref;
    return value;
  }
  // CREATE
  /**
   * Creates a new item or updates an existing one within the collection based on the provided data.
   * @param {Object} data - The data to create a new item or update an existing one.
   * @return {CollectionItem} The newly created or updated CollectionItem.
   */
  create_or_update(data = {}) {
    const existing = this.find_by(data);
    const item = existing ? existing : new this.item_type(this.env);
    item.is_new = !!!existing;
    const changed = item.update_data(data); // handles this.data
    if (existing && !changed) return existing; // if existing item and no changes, return existing item (no need to save)
    if (item.validate_save()) this.set(item); // make it available in collection (if valid)

    // dynamically handle async init functions
    if (item.init instanceof AsyncFunction) return new Promise((resolve, reject) => { item.init(data).then(() => resolve(item)); });
    item.init(data); // handles functions that involve other items
    return item;
  }
  /**
   * Finds an item in the collection that matches the given data.
   * @param {Object} data - The criteria used to find the item.
   * @return {CollectionItem|null} The found CollectionItem or null if not found.
   */
  find_by(data) {
    if(data.key) return this.get(data.key);
    const temp = new this.item_type(this.env);
    const temp_data = JSON.parse(JSON.stringify(data, temp.update_data_replacer));
    deep_merge(temp.data, temp_data); // deep merge data
    // temp.update_data(data); // call deep merge directly to prevent double call of update_data in sub-classes
    // if (temp.key) temp_data.key = temp.key;
    return temp.key ? this.get(temp.key) : null;
  }
  // READ
  /**
   * Filters the items in the collection based on the provided options.
   * @param {Object} opts - The options used to filter the items.
   */
  filter(opts) { return Object.entries(this.items).filter(([key, item]) => item.filter(opts)).map(([key, item]) => item); }
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
      // console.log("filter_opts: ", filter_opts);
      const filtered = this.filter(opts);
      // console.log("filtered: " + filtered.length);
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
    return this.items[this.keys[Math.floor(Math.random() * this.keys.length)]];
  }
  // UPDATE
  set(item) {
    if (!item.key) throw new Error("Item must have key property");
    this.items[item.key] = item;
    // if (!this.keys.includes(item.key)) this.keys.push(item.key); // this.keys replaced by getter
  }
  update_many(keys = [], data = {}) { this.get_many(keys).forEach((item) => item.update_data(data)); }
  // DESTROY
  clear() {
    this.items = {};
    // this.keys = []; // replaced by getter
  }
  delete(key) {
    delete this.items[key];
    // this.keys = this.keys.filter((k) => k !== key); // replaced by getter
  }
  delete_many(keys = []) {
    keys.forEach((key) => delete this.items[key]);
    // this.keys = Object.keys(this.items); // replaced by getter
  }
  // CONVENIENCE METHODS (namespace getters)
  static get collection_name() { return this.name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(); }
  get collection_name() { return (this._collection_name) ? this._collection_name : this.constructor.collection_name; }
  set collection_name(name) { this._collection_name = name; }
  get keys() { return Object.keys(this.items); }
  get item_class_name() { return this.constructor.name.slice(0, -1).replace(/(ie)$/g, 'y'); } // remove 's' from end of name & if name ends in 'ie', replace with 'y'
  get item_name() { return this.item_class_name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(); }
  get item_type() { return this.env.item_types[this.item_class_name]; }
}
exports.Collection = Collection;

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
async function sequential_async_processor(funcs, initial_value, opts = {}) {
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
exports.sequential_async_processor = sequential_async_processor;
