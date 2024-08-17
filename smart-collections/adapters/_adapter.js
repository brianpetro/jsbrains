export class SmartCollectionAdapter{
  constructor(collection) {
    this.collection = collection;
    this.env = this.collection.env;
    this.save_timeout = null;
    this._save_queue = {};
  }
  // REQUIRED METHODS IN SUBCLASSES
  async load() { throw new Error("SmartCollectionAdapter: load() not implemented"); }
  async save_item(key) { throw new Error("SmartCollectionAdapter: save_item() not implemented"); }
  // END REQUIRED METHODS IN SUBCLASSES

  get items() { return this.collection.items; }
  get data_path() { return this.collection.data_path; }

  add_to_collection(entity) {
    this.env[entity.collection_name].items[entity.key] = entity;
  }
  /**
   * Schedules a save operation to prevent multiple saves happening at the same time.
   */
  save() {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => {
      this.save_queue();
      this.save_timeout = null;
    }, 3000);
  }
  queue_save(key) {
    this._save_queue[key] = true;
    this.save();
  }
  async save_queue() {
    if(this._saving) return console.log("Already saving");
    this._saving = true; // prevent multiple saves at once
    setTimeout(() => { this._saving = false; }, 10000); // set _saving to false after 10 seconds
    const batch_items = [];
    for (const key of Object.keys(this._save_queue)) {
      batch_items.push(this.save_item(key));
    }
    await Promise.all(batch_items);
    this._saving = false;
    this._save_queue = {};
  }
}