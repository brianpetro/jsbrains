import { create_uid, deep_merge } from './helpers.js';
import { collection_instance_name_from } from "./utils/collection_instance_name_from.js";

/**
 * Represents an item within a collection, providing methods for data manipulation, validation, and interaction with its collection.
 */
export class CollectionItem {
  /**
   * Default properties for an instance of CollectionItem.
   * @returns {Object} Default data configuration.
   */
  static get defaults() {
    return {
      data: {
        // key: null,
      },
    };
  }

  /**
   * Creates an instance of CollectionItem.
   * @param {Object} brain - The central storage or context.
   * @param {Object|null} data - Initial data for the item.
   */
  constructor(env, data = null) {
    this.env = env;
    // this.brain = this.env; // DEPRECATED
    this.config = this.env?.config;
    this.merge_defaults();
    if (data) this.data = data;
    if(!this.data.class_name) this.data.class_name = this.constructor.name;
  }

  /**
   * Merges default properties from all classes in the inheritance chain.
   */
  merge_defaults() {
    let current_class = this.constructor;
    while (current_class) { // deep merge defaults
      for (let key in current_class.defaults) {
        if (typeof current_class.defaults[key] === 'object') this[key] = { ...current_class.defaults[key], ...this[key] };
        else this[key] = current_class.defaults[key];
      }
      current_class = Object.getPrototypeOf(current_class);
    }
  }

  /**
   * Generates or retrieves a unique key for the item. Can be overridden in child classes.
   * @returns {string} The unique key.
   */
  get_key() {
    // console.log("called default get_key");
    return create_uid(this.data);
  }
  // update_data - for data in this.data
  /**
   * Updates the data of this item with new data.
   * @param {Object} data - The new data for the item.
   * @returns {boolean} True if data was successfully updated.
   */
  update_data(data) {
    data = JSON.stringify(data, this.update_data_replacer);
    data = JSON.parse(data);
    const data_entries = Object.entries(data);
    const changed = data_entries.some(([key, value]) => this.data[key] !== value);
    if(!changed) return false; // return false if no changes
    deep_merge(this.data, data); // deep merge data
    return true; // return true if data changed (default true)
  }

  /**
   * Custom replacer function for JSON.stringify used in update_data to handle special object types.
   * @param {string} key - The key of the property being stringified.
   * @param {any} value - The value of the property being stringified.
   * @returns {any} The value to be used in the JSON string.
   */
  update_data_replacer(key, value) {
    if (value instanceof CollectionItem) return value.ref;
    if (Array.isArray(value)) return value.map((val) => (val instanceof CollectionItem) ? val.ref : val);
    return value;
  }
  // init - for data not in this.data
  /**
   * Initializes the item with input_data, potentially asynchronously.
   * Handles interactions with other collection items.
   */
  init() { }

  queue_save() { this._queue_save = true; }
  async save(ajson=null) {
    try{
      await this.data_adapter.save(this, ajson);
    }catch(err){
      this._queue_save = true;
      console.error(err, err.stack);
    }
  }
  queue_load() { this._queue_load = true; }
  async load() {
    try{
      await this.data_adapter.load(this);
    }catch(err){
      this._load_error = err;
      this.on_load_error(err);
      // console.error(err, err.stack);
    }
  }
  on_load_error(err){
    this.queue_load();
  }

  /**
   * Validates the item's data before saving.
   * @returns {boolean} True if the data is valid for saving.
   */
  validate_save() {
    if(!this.key) return false;
    if(this.key.trim() === '') return false;
    if(this.key === 'undefined') return false;
    return true;
  }

  /**
   * Deletes the item from its collection.
   */
  delete() {
    this.deleted = true;
    this.queue_save();
  }

  /**
   * Filters items in the collection based on provided options.
   * functional filter (returns true or false) for filtering items in collection; called by collection class
   * @param {Object} filter_opts - Filtering options.
   * @param {string} [filter_opts.exclude_key] - A single key to exclude.
   * @param {string[]} [filter_opts.exclude_keys] - An array of keys to exclude. If exclude_key is provided, it's added to this array.
   * @param {string} [filter_opts.exclude_key_starts_with] - Exclude keys starting with this string.
   * @param {string[]} [filter_opts.exclude_key_starts_with_any] - Exclude keys starting with any of these strings.
   * @param {string} [filter_opts.exclude_key_includes] - Exclude keys that include this string.
   * @param {string} [filter_opts.key_ends_with] - Include only keys ending with this string.
   * @param {string} [filter_opts.key_starts_with] - Include only keys starting with this string.
   * @param {string[]} [filter_opts.key_starts_with_any] - Include only keys starting with any of these strings.
   * @param {string} [filter_opts.key_includes] - Include only keys that include this string.
   * @returns {boolean} True if the item passes the filter, false otherwise.
   */
  filter(filter_opts = {}) {
    const {
      exclude_key,
      exclude_keys = exclude_key ? [exclude_key] : [],
      exclude_key_starts_with,
      exclude_key_starts_with_any,
      exclude_key_includes,
      key_ends_with,
      key_starts_with,
      key_starts_with_any,
      key_includes,
      limit,
    } = filter_opts;
    if(limit && this.collection.filter_results_ct >= limit) return false;

    // Exclude keys that are in the exclude_keys array
    if (exclude_keys?.includes(this.key)) return false;

    // Exclude keys that start with a specific string
    if (exclude_key_starts_with && this.key.startsWith(exclude_key_starts_with)) return false;

    // Exclude keys that start with any of the provided prefixes
    if (exclude_key_starts_with_any && exclude_key_starts_with_any.some((prefix) => this.key.startsWith(prefix))) return false;

    // Include only keys that end with a specific string
    if (key_ends_with && !this.key.endsWith(key_ends_with)) return false;

    // Include only keys that start with a specific string
    if (key_starts_with && !this.key.startsWith(key_starts_with)) return false;

    // Include only keys that start with any of the provided prefixes
    if (key_starts_with_any && !key_starts_with_any.some((prefix) => this.key.startsWith(prefix))) return false;

    // Include only keys that include a specific string
    if (key_includes && !this.key.includes(key_includes)) return false;

    // Exclude keys that include a specific string
    if (exclude_key_includes && this.key.includes(exclude_key_includes)) return false;

    // OVERRIDE FILTER LOGIC here: pattern: if(opts.pattern && !this.data[opts.pattern.matcher]) return false;

    // If all conditions pass, return true
    return true;
  }

  /**
   * Parses the item's data for any necessary processing or transformation. Placeholder for override in child classes.
   */
  parse() { }

  /**
   * Retrieves the collection name derived from the class name.
   * @returns {string} The collection name.
   */
  static get collection_key() { return collection_instance_name_from(this.name); }

  /**
   * Retrieves the collection name for the instance, either from data or the class method.
   * @returns {string} The collection name.
   */
  get collection_key() { return collection_instance_name_from(this.constructor.name); }

  /**
   * Retrieves the collection this item belongs to.
   * @returns {Object} The collection object.
   */
  get collection() { return this.env[this.collection_key]; }

  /**
   * Retrieves or generates the key for this item.
   * @returns {string} The item's key.
   */
  get key() { return this.data?.key || this.get_key(); }

  /**
   * Provides a reference object for this item, containing the collection name and key.
   * @returns {Object} The reference object.
   */
  get ref() { return { collection_key: this.collection_key, key: this.key }; }

  /**
   * Retrieves string representation of the item, including its key and data.
   * @returns {string} A string representing the item.
   */
  get ajson() { return `${JSON.stringify(this.ajson_key)}: ${(this.deleted) ? 'null' : JSON.stringify(this.data)}`; }
  get ajson_key() { return this.constructor.name + ":" + this.key; }
  get data_adapter() { return this.collection.data_adapter; }
  get multi_ajson_file_name() { return this.key.replace(/[\s\/\.]/g, '_').replace(".md", ""); }
  get data_path() { return this.data_adapter.data_folder + (this.env.fs?.sep || "/") + this.multi_ajson_file_name + '.ajson'; }

  // settings convenience methods
  get settings() { return this.env.settings[this.collection_key]; }
  set settings(settings) {
    this.env.settings[this.collection_key] = settings;
    this.env.smart_env_settings.save();
  }
}