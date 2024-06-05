const { LongTermMemory } = require('./long_term_memory');
const { openDB } = require('idb');
class IDBLTM extends LongTermMemory {
  constructor(collection) {
    super(collection);
    openDB(this.file_name, 1, {
      upgrade: this.upgradeDB.bind(this)
    }).then(db => this.db = db);
  }
  async upgradeDB(db, oldVersion, newVersion, transaction) {
    console.log("Upgrading DB", this.file_name);
    if (!db.objectStoreNames.contains(this.file_name)) {
      db.createObjectStore(this.file_name);
    }
  }
  // clear database
  async clear() {
    await this.db.clear(this.file_name);
  }
  async load() {
    const time = Date.now();
    while(!this.db) await new Promise(r => setTimeout(r, 100));
    if(!this.db.objectStoreNames.contains(this.file_name)) {
      console.log("Collection not found: " + this.file_name);
      return;
    }
    console.log("Getting keys for: " + this.file_name);
    const keys = await this.db.getAllKeys(this.file_name);
    console.log(keys);
    const items = await Promise.all(keys.map(key => this.db.get(this.file_name, key)));
    for(let i = 0; i < keys.length; i++) {
      this.collection.items[keys[i]] = JSON.parse(items[i], this.reviver.bind(this));
      // this.collection.keys.push(keys[i]); // replaced by getter
    }
    console.log("Loaded " + this.collection.keys.length + ' items from ' + this.file_name + " in " + (Date.now() - time) + "ms");
  }
  // wraps _save in timeout to prevent multiple saves at once
  save() {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => { this._save(); }, 10000);
  }
  async _save(force=false) {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = null;
    if(this._saving) return console.log("Already saving: " + this.file_name);
    this._saving = true;
    setTimeout(() => { this._saving = false; }, 10000);
    const start = Date.now();
    console.log("Saving: " + this.file_name);
    const transaction = this.db.transaction(this.file_name, 'readwrite');
    const store = transaction.objectStore(this.file_name);
    for(let key in this.items) {
      if(!this.items[key]?.vec) continue;
      const item = JSON.stringify(this.items[key], this.replacer.bind(this));
      store.put(item, key);
    }
    await transaction.done;
    console.log("Saved " + this.file_name + " in " + (Date.now() - start) + "ms");
  }
}
exports.IDBLTM = IDBLTM;