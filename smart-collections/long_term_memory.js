class LongTermMemory {
  constructor(collection) {
    this.env = collection.env;
    this.brain = this.env;
    this.collection = collection;
    this.save_timeout = null;
  }
  static wake_up(collection, adapter) {
    const ltm = new adapter(collection);
    return ltm;
  }
  get collection_name() { return this.collection.collection_name; }
  get item_name() { return this.collection.item_name; }
  get data_path() { return this.env.data_path; }
  get file_name() { return this.collection.file_name || this.collection.collection_name; }
  get file_path() { return this.data_path + '/' + this.file_name; }
  get items() { return this.collection.items; }
  set items(items) { this.collection.items = items; }
  get keys() { return this.collection.keys; }
  // set keys(keys) { this.collection.keys = keys; } // replaced by getter
  async load() { }
  save() { if (this.constructor.name !== 'LongTermMemory') console.log("called default, override me"); }
  async _save() { if (this.constructor.name !== 'LongTermMemory') console.log("called default, override me"); }
  reviver(key, value) { return this.collection.reviver(key, value); }
  replacer(key, value) { return this.collection.replacer(key, value); }
}

// EXPORTS
exports.LongTermMemory = LongTermMemory;