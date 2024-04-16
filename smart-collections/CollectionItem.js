const helpers = require('./helpers');
const {
  create_uid,
  deep_merge,
  collection_instance_name_from,
} = helpers;

/**
 * Represents an item within a collection, providing methods for data manipulation, validation, and interaction with its collection.
 */
class CollectionItem {
  /**
   * Default properties for an instance of CollectionItem.
   * @returns {Object} Default data configuration.
   */
  static get defaults() {
    return {
      data: {
        key: null,
      },
    };
  }

  /**
   * Creates an instance of CollectionItem.
   * @param {Object} brain - The central storage or context.
   * @param {Object|null} data - Initial data for the item.
   */
  constructor(brain, data = null) {
    this.brain = brain;
    this.config = this.brain?.config;
    this.merge_defaults();
    if (data) this.data = data;
    this.data.class_name = this.constructor.name;
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
    console.log("called default get_key");
    return create_uid(this.data);
  }
  // update_data - for data in this.data
  /**
   * Updates the data of this item with new data.
   * @param {Object} data - The new data for the item.
   * @returns {boolean} True if data was successfully updated.
   */
  update_data(data) {
    data = JSON.parse(JSON.stringify(data, this.update_data_replacer));
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
  init() { this.save(); } // should always call this.save() in child class init() overrides

  /**
   * Saves the current state of the item to its collection.
   */
  save() {
    if (!this.validate_save()) {
      if (this.key) this.collection.delete(this.key);
      return console.error("Invalid save: ", { data: this.data, stack: new Error().stack });
    }
    this.collection.set(this); // set entity in collection
    this.collection.save(); // save collection
  }

  /**
   * Validates the item's data before saving.
   * @returns {boolean} True if the data is valid for saving.
   */
  validate_save() {
    if(!this.key) return false;
    if(this.key === '') return false;
    if(this.key === 'undefined') return false;
    return true;
  }

  /**
   * Deletes the item from its collection.
   */
  delete() { this.collection.delete(this.key); }

  // functional filter (returns true or false) for filtering items in collection; called by collection class
  /**
   * Filters items in the collection based on provided options.
   * @param {Object} opts - Filtering options.
   * @returns {boolean} True if the item passes the filter.
   */
  filter(opts = {}) {
    const {
      exclude_key,
      exclude_keys = exclude_key ? [exclude_key] : [],
      exclude_key_starts_with,
      key_ends_with,
      key_starts_with,
      key_starts_with_any,
    } = opts;
    if (exclude_keys?.includes(this.key)) return false;
    if (exclude_key_starts_with && this.key.startsWith(exclude_key_starts_with)) return false;
    if (key_ends_with && !this.key.endsWith(key_ends_with)) return false;
    if (key_starts_with && !this.key.startsWith(key_starts_with)) return false;
    if (key_starts_with_any && !key_starts_with_any.some((prefix) => this.key.startsWith(prefix))) return false;
    // OVERRIDE FILTER LOGIC here: pattern: if(opts.pattern && !this.data[opts.pattern.matcher]) return false;
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
  static get collection_name() { return collection_instance_name_from(this.name); }

  /**
   * Retrieves the collection name for the instance, either from data or the class method.
   * @returns {string} The collection name.
   */
  get collection_name() { return this.data.collection_name ? this.data.collection_name : this.constructor.collection_name; }

  /**
   * Retrieves the collection this item belongs to.
   * @returns {Object} The collection object.
   */
  get collection() { return this.brain[this.collection_name]; }

  /**
   * Retrieves or generates the key for this item.
   * @returns {string} The item's key.
   */
  get key() { return this.data.key = this.data.key || this.get_key(); }

  /**
   * Provides a reference object for this item, containing the collection name and key.
   * @returns {Object} The reference object.
   */
  get ref() { return { collection_name: this.collection_name, key: this.key }; }

  /**
   * Retrieves the sequence key for this item, used for building sequence keys.
   * @returns {string} The sequence key.
   */
  get seq_key() { return this.key; } // used for building sequence keys
}
exports.CollectionItem = CollectionItem;