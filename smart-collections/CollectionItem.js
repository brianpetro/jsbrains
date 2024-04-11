const helpers = require('./helpers');
const {
  create_uid,
  deep_merge,
  collection_instance_name_from,
} = helpers;
/**
 * Represents an item within a collection.
 */
class CollectionItem {
  static get defaults() {
    return {
      data: {
        key: null,
      },
    };
  }
  constructor(brain, data = null) {
    this.brain = brain;
    this.config = this.brain?.config;
    this.merge_defaults();
    if (data) this.data = data;
    this.data.class_name = this.constructor.name;
  }
  // Merge defaults from all classes in the inheritance chain (from top to bottom, so child classes override parent classes)
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
  // OVERRIDE IN CHILD CLASSES to customize key
  get_key() {
    console.log("called default get_key");
    return create_uid(this.data);
  }
  // update_data - for data in this.data
  /**
   * Updates the data of this item.
   * @param {Object} input_data - The new data for the item.
   */
  update_data(data) {
    data = JSON.parse(JSON.stringify(data, this.update_data_replacer));
    deep_merge(this.data, data); // deep merge data
    return true; // return true if data changed (default true)
  }
  update_data_replacer(key, value) {
    if (value instanceof CollectionItem) return value.ref;
    if (Array.isArray(value)) return value.map((val) => (val instanceof CollectionItem) ? val.ref : val);
    return value;
  }
  // init - for data not in this.data
  /**
   * Initializes the item with input_data, potentially asynchronously.
   * Handles interactions with other collection items.
   * @param {Object} input_data - The initial data for the item.
   */
  init() { this.save(); } // should always call this.save() in child class init() overrides
  save() {
    if (!this.validate_save()) {
      if (this.key) this.collection.delete(this.key);
      return console.error("Invalid save: ", { data: this.data, stack: new Error().stack });
    }
    this.collection.set(this); // set entity in collection
    this.collection.save(); // save collection
  }
  validate_save() {
    if(!this.key) return false;
    if(this.key === '') return false;
    if(this.key === 'undefined') return false;
    return true;
  }
  delete() { this.collection.delete(this.key); }
  // functional filter (returns true or false) for filtering items in collection; called by collection class
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
  parse() { }
  // HELPER FUNCTIONS
  // CONVENIENCE METHODS (namespace getters)
  static get collection_name() { return collection_instance_name_from(this.name); }
  // static get collection_name() { return this.name
  //   .replace(/([a-z])([A-Z])/g, '$1_$2') // convert camelCase to snake_case
  //   .toLowerCase() // convert to lowercase
  //   .replace(/y$/, 'ie') // ex. summaries
  //   + 's';
  // }
  get collection_name() { return this.data.collection_name ? this.data.collection_name : this.constructor.collection_name; }
  get collection() { return this.brain[this.collection_name]; }
  get key() { return this.data.key = this.data.key || this.get_key(); }
  get ref() { return { collection_name: this.collection_name, key: this.key }; }
  get seq_key() { return this.key; } // used for building sequence keys
}
exports.CollectionItem = CollectionItem;