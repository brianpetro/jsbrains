/**
 * Class representing a long-term memory storage for collections.
 */
class LongTermMemory {
  /**
   * Creates an instance of LongTermMemory.
   * @param {Object} collection - The collection object containing the environment and items.
   */
  constructor(collection) {
    this.env = collection.env;
    this.brain = this.env;
    this.collection = collection;
    this.save_timeout = null;
  }

  /**
   * Static method to initialize a LongTermMemory instance using a specific adapter.
   * @param {Object} collection - The collection object to be used.
   * @param {Function} adapter - The adapter class to be instantiated.
   * @returns {LongTermMemory} An instance of the adapter class.
   */
  static wake_up(collection, adapter) {
    const ltm = new adapter(collection);
    return ltm;
  }

  /**
   * Gets the name of the collection.
   * @returns {string} The name of the collection.
   */
  get collection_name() { return this.collection.collection_name; }

  /**
   * Gets the name of the item in the collection.
   * @returns {string} The name of the item.
   */
  get item_name() { return this.collection.item_name; }

  /**
   * Gets the data path from the environment.
   * @returns {string} The data path.
   */
  get data_path() { return this.env.data_path; }

  /**
   * Gets the file name, defaulting to the collection name if not explicitly set.
   * @returns {string} The file name.
   */
  get file_name() { return this.collection.file_name || this.collection.collection_name; }

  /**
   * Constructs the full file path for the collection's data.
   * @returns {string} The full file path.
   */
  get file_path() { return this.data_path + '/' + this.file_name; }

  /**
   * Gets the items of the collection.
   * @returns {Array} The items of the collection.
   */
  get items() { return this.collection.items; }

  /**
   * Sets the items of the collection.
   * @param {Array} items - The new items of the collection.
   */
  set items(items) { this.collection.items = items; }

  /**
   * Gets the keys of the collection.
   * @returns {Array} The keys of the collection.
   */
  get keys() { return this.collection.keys; }

  /**
   * Placeholder for loading data, to be implemented by subclasses.
   */
  async load() { }

  /**
   * Default save method, logs a message if not overridden.
   */
  save() { if (this.constructor.name !== 'LongTermMemory') console.log("called default, override me"); }

  /**
   * Default asynchronous save method, logs a message if not overridden.
   */
  async _save() { if (this.constructor.name !== 'LongTermMemory') console.log("called default, override me"); }

  /**
   * Revives a value from a key-value pair.
   * @param {string} key - The key in the key-value pair.
   * @param {*} value - The value in the key-value pair.
   * @returns {*} The possibly transformed value.
   */
  reviver(key, value) { return this.collection.reviver(key, value); }

  /**
   * Replaces a value before it is serialized.
   * @param {string} key - The key in the key-value pair.
   * @param {*} value - The value in the key-value pair.
   * @returns {*} The possibly transformed value.
   */
  replacer(key, value) { return this.collection.replacer(key, value); }
}

// EXPORTS
exports.LongTermMemory = LongTermMemory;