import { create_uid, deep_merge } from './utils/helpers.js';
import { collection_instance_name_from } from "./utils/collection_instance_name_from.js";
import { deep_equal } from "./utils/deep_equal.js";

/**
 * @class CollectionItem
 *
 * Represents an individual item within a `Collection`.
 *
 * **Key Features:**
 * - Encapsulates data and behavior for a single item.
 * - Supports lazy loading via `_queue_load`.
 * - Provides data validation and sanitization before saving.
 * - Can be filtered by a variety of key-based filters.
 */
export class CollectionItem {
  /**
   * Default properties for an instance of CollectionItem.
   * Override in subclasses to define different defaults.
   * @returns {Object}
   */
  static get defaults() {
    return {
      data: {}
    };
  }

  /**
   * @param {Object} env - The environment/context.
   * @param {Object|null} [data=null] - Initial data for the item.
   */
  constructor(env, data = null) {
    this.env = env;
    this.config = this.env?.config;
    this.merge_defaults();

    if (data) deep_merge(this.data, data);
    if (!this.data.class_name) this.data.class_name = this.constructor.name;
  }

  /**
   * Loads an item from data and initializes it.
   * @param {Object} env
   * @param {Object} data
   * @returns {CollectionItem}
   */
  static load(env, data) {
    const item = new this(env, data);
    item.init();
    return item;
  }

  /**
   * Merge default properties from the entire inheritance chain.
   * @private
   */
  merge_defaults() {
    let current_class = this.constructor;
    while (current_class) {
      for (let key in current_class.defaults) {
        const default_val = current_class.defaults[key];
        if (typeof default_val === 'object') {
          this[key] = { ...default_val, ...this[key] };
        } else {
          this[key] = (this[key] === undefined) ? default_val : this[key];
        }
      }
      current_class = Object.getPrototypeOf(current_class);
    }
  }

  /**
   * Generates or retrieves a unique key for the item.
   * Key syntax supports:
   * - `[i]` for sequences
   * - `/` for super-sources (groups, directories, clusters)
   * - `#` for sub-sources (blocks)
   * @returns {string} The unique key
   */
  get_key() {
    return create_uid(this.data);
  }

  /**
   * Updates the item data and returns true if changed.
   * @param {Object} data
   * @returns {boolean} True if data changed.
   */
  update_data(data) {
    const sanitized_data = this.sanitize_data(data);
    const current_data = { ...this.data };
    deep_merge(current_data, sanitized_data);
    const changed = !deep_equal(this.data, current_data);
    if (!changed) return false;
    this.data = current_data;
    return true;
  }

  /**
   * Sanitizes data for saving. Ensures no circular references.
   * @param {*} data
   * @returns {*} Sanitized data.
   */
  sanitize_data(data) {
    if (data instanceof CollectionItem) return data.ref;
    if (Array.isArray(data)) return data.map(val => this.sanitize_data(val));
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => {
        acc[key] = this.sanitize_data(data[key]);
        return acc;
      }, {});
    }
    return data;
  }

  /**
   * Initializes the item. Override as needed.
   * @param {Object} [input_data] - Additional data that might be provided on creation.
   */
  init(input_data) { /* NO-OP by default */ }

  /**
   * Queues this item for saving.
   */
  queue_save() { this._queue_save = true; }

  /**
   * Saves this item using its data adapter.
   * @returns {Promise<void>}
   */
  async save() {
    try {
      await this.data_adapter.save_item(this);
      this.init();
    } catch (err) {
      this._queue_save = true;
      console.error(err, err.stack);
    }
  }

  /**
   * Queues this item for loading.
   */
  queue_load() { this._queue_load = true; }

  /**
   * Loads this item using its data adapter.
   * @returns {Promise<void>}
   */
  async load() {
    try {
      await this.data_adapter.load_item(this);
      this.init();
    } catch (err) {
      this._load_error = err;
      this.on_load_error(err);
    }
  }

  /**
   * Handles load errors by re-queuing for load.
   * Override if needed.
   * @param {Error} err
   */
  on_load_error(err) {
    this.queue_load();
  }

  /**
   * Validates the item before saving. Checks for presence and validity of key.
   * @returns {boolean}
   */
  validate_save() {
    if (!this.key) return false;
    if (this.key.trim() === '') return false;
    if (this.key === 'undefined') return false;
    return true;
  }

  /**
   * Marks this item as deleted. This does not immediately remove it from memory,
   * but queues a save that will result in the item being removed from persistent storage.
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
    } = filter_opts;

    // Exclude keys that are in the exclude_keys array
    if (exclude_keys?.includes(this.key)) return false;

    // Exclude keys that start with a specific string
    if (exclude_key_starts_with && this.key.startsWith(exclude_key_starts_with)) return false;

    // Exclude keys that start with any of the provided prefixes
    if (exclude_key_starts_with_any && exclude_key_starts_with_any.some((prefix) => this.key.startsWith(prefix))) return false;
    
    // Exclude keys that include a specific string
    if (exclude_key_includes && this.key.includes(exclude_key_includes)) return false;

    // Include only keys that end with a specific string
    if (key_ends_with && !this.key.endsWith(key_ends_with)) return false;

    // Include only keys that start with a specific string
    if (key_starts_with && !this.key.startsWith(key_starts_with)) return false;

    // Include only keys that start with any of the provided prefixes
    if (key_starts_with_any && !key_starts_with_any.some((prefix) => this.key.startsWith(prefix))) return false;

    // Include only keys that include a specific string
    if (key_includes && !this.key.includes(key_includes)) return false;

    // OVERRIDE FILTER LOGIC here: pattern: if(opts.pattern && !this.data[opts.pattern.matcher]) return false;

    // If all conditions pass, return true
    return true;
  }

  /**
   * Parses item data for additional processing. Override as needed.
   */
  parse() { /* NO-OP by default */ }

  /**
   * Helper function to render a component in the item scope
   * @param {*} component_key 
   * @param {*} opts 
   * @returns 
   */
  async render_component(component_key, opts = {}) {
    return await this.env.render_component(component_key, this, opts);
  }

  get actions() {
    if(!this._actions) {
      this._actions = Object.entries(this.env.opts.items[this.item_type_key].actions || {}).reduce((acc, [k,v]) => {
        acc[k] = v.bind(this);
        return acc;
      }, {});
    }
    return this._actions;
  }



  /**
   * Derives the collection key from the class name.
   * @returns {string}
   */
  static get collection_key() {
    let name = this.name;
    if (name.match(/\d$/)) name = name.slice(0, -1);
    return collection_instance_name_from(name);
  }

  /**
   * @returns {string} The collection key for this item.
   */
  get collection_key() {
    let name = this.constructor.name;
    if (name.match(/\d$/)) name = name.slice(0, -1);
    return collection_instance_name_from(name);
  }

  /**
   * Retrieves the parent collection from the environment.
   * @returns {Collection}
   */
  get collection() {
    return this.env[this.collection_key];
  }

  /**
   * @returns {string} The item's key.
   */
  get key() {
    return this.data?.key || this.get_key();
  }

  get item_type_key() {
    let name = this.constructor.name;
    if (name.match(/\d$/)) name = name.slice(0, -1);
    return camel_case_to_snake_case(name);
  }


  /**
   * A simple reference object for this item.
   * @returns {{collection_key: string, key: string}}
   */
  get ref() {
    return { collection_key: this.collection_key, key: this.key };
  }

  /**
   * @returns {Object} The data adapter for this item's collection.
   */
  get data_adapter() { 
    return this.collection.data_adapter; 
  }

  /**
   * @returns {Object} The filesystem adapter.
   */
  get data_fs() { 
    return this.collection.data_fs; 
  }

  /**
   * Access to collection-level settings.
   * @returns {Object}
   */
  get settings() {
    if (!this.env.settings[this.collection_key]) this.env.settings[this.collection_key] = {};
    return this.env.settings[this.collection_key];
  }

  set settings(settings) {
    this.env.settings[this.collection_key] = settings;
    this.env.smart_settings.save();
  }

  /**
   * Render this item into a container using the item's component.
   * @deprecated 2024-12-02 Use explicit component pattern from environment
   * @param {HTMLElement} container
   * @param {Object} opts
   * @returns {Promise<HTMLElement>}
   */
  async render_item(container, opts = {}) {
    const frag = await this.component.call(this.smart_view, this, opts);
    container.innerHTML = '';
    container.appendChild(frag);
    return container;
  }

  /**
   * @deprecated use env.smart_view
   * @returns {Object}
   */
  get smart_view() {
    if (!this._smart_view) this._smart_view = this.env.init_module('smart_view');
    return this._smart_view;
  }

  /**
   * Override in child classes to set the component for this item
   * @deprecated 2024-12-02
   * @returns {Function} The render function for this component
   */
  get component() { return item_component; }
}

/**
 * @function camel_case_to_snake_case
 * @description Convert CamelCase => snake_case for consistent environment keys.
 */
export function camel_case_to_snake_case(str) {
  const result = str
    .replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
    .replace(/^_/, '') // remove leading underscore
    .replace(/2$/, '') // remove trailing 2 (bundled subclasses)
    ;
  return result;
}