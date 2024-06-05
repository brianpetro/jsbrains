const { LongTermMemory } = require('./long_term_memory');
const fs = require('fs');
class SQLiteLTM extends LongTermMemory {
  constructor(collection) {
    super(collection);
    this.base_path = this.brain.main.app.vault.adapter.basePath;
    // create file if it doesn't exist
    console.log("Creating: " + this.file_path);
    this.sqlite3 = require('sqlite3');
    if(!fs.existsSync(this.file_path)) fs.writeFileSync(this.file_path, '');
    console.log("Created: " + this.file_path);
    this.db = new this.sqlite3.Database(this.file_path, this.sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Connected to the SQLite database.');
      }
    });
  }
  async create_table() {
    this.db.run(`CREATE TABLE IF NOT EXISTS ${this.file_name} (key TEXT PRIMARY KEY, value TEXT)`);
  }
  async load() {
    const time = Date.now();
    // create table if it doesn't exist
    await this.create_table();
    console.log("Loading: " + this.file_path);
    this.db.all(`SELECT * FROM ${this.file_name}`, [], (err, rows) => {
      if (err) {
        throw err;
      }
      rows.forEach((row) => {
        this.collection.items[row.key] = new (this.brain.item_types[row.class_name])(this.brain, row);
        // this.collection.keys.push(row.key); // replaced by getter
      });
      // console.log("Loaded: " + this.file_name);
      console.log("Loaded " + this.collection.keys.length + ' items from ' + this.file_name + " in " + (Date.now() - time) + "ms");
    });
  }
  // wraps _save in timeout to prevent multiple saves at once
  save() {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => { this._save(); }, 10000);
  }
  // saves collection to file
  async _save(force=false) {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = null;
    if(this._saving) return console.log("Already saving: " + this.file_name);
    this._saving = true; // prevent multiple saves at once
    setTimeout(() => { this._saving = false; }, 10000); // set _saving to false after 10 seconds
    const start = Date.now();
    console.log("Saving: " + this.file_name);
    const stmt = this.db.prepare(`INSERT INTO ${this.file_name} (key, value) VALUES (?, ?)`);
    for(let key in this.items) {
      if(!this.items[key]?.vec) continue; // skip items without vec
      stmt.run(key, JSON.stringify(this.items[key], this.replacer.bind(this)));
    }
    stmt.finalize();
    const end = Date.now(); // log time
    const time = end - start;
    console.log("Saved " + this.file_name + " in " + time + "ms");
  }
  get file_path() { return this.base_path + '/' + this.data_path + '/' + this.file_name + '.sqlite'; }
}
exports.SQLiteLTM = SQLiteLTM;