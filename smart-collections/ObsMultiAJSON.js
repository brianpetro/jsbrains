const { LongTermMemory } = require('./long_term_memory');
class ObsMultiAJSON extends LongTermMemory {
  constructor(collection) {
    super(collection);
    this.adapter = this.env.main.app.vault.adapter;
  }
  async load() {
    console.log("Loading collection items");
    if(!(await this.adapter.exists(this.data_path))) await this.adapter.mkdir(this.data_path);
    const files = (await this.adapter.list(this.data_path)).files; // List all files in the directory
    for (const file_path of files) {
      try {
        if (file_path.endsWith('.ajson')) { // Ensure it's an .ajson file
          const content = await this.adapter.read(file_path);
          // if last char is , remove it before wrapping in {} and parse
          const data = JSON.parse(`{${content.endsWith(',') ? content.slice(0, -1) : content}}`);
          let pruned = '';
          Object.entries(data).forEach(([key, value]) => {
            const entity = new (this.env.item_types[value.class_name])(this.env, value);
            this.env[entity.collection_name].items[key] = entity;
            pruned += entity.ajson + ',\n';
          });
          // parsed data removes any duplicate keys (pruned)
          await this.adapter.write(file_path, pruned.trim());
        }
      } catch (err) {
        console.log("Error loading file: " + file_path);
        console.log(err.stack); // stack trace
      }
    }
    console.log("Loaded collection items");
  }
  // wraps _save in timeout to prevent multiple saves at once
  save() {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => { this._save(); }, 10000);
  }
  // saves collection to file
  async _save(force=false) {
    let saved_ct = 0;
    if(this._saving) return console.log("Already saving");
    this._saving = true; // prevent multiple saves at once
    setTimeout(() => { this._saving = false; }, 10000); // set _saving to false after 10 seconds
    const start = Date.now();
    console.log("Saving collection items");
    // ensure data_path exists
    if(!(await this.adapter.exists(this.data_path))) await this.adapter.mkdir(this.data_path);
    const items = Object.values(this.items).filter(i => i.vec && i.changed);
    if(items.length === 0) {
      this._saving = false;
      console.log("Nothing to save");
      return;
    }
    try {
      for (const item of items) {
        const item_file_path = `${this.data_path}/${item.multi_ajson_file_name}.ajson`; // Use item.file_name for file naming
        await this.adapter.append(item_file_path, '\n' + item.ajson + ',');
        saved_ct++;
      }
      const end = Date.now(); // log time
      const time = end - start;
      console.log(`Saved ${saved_ct} collection items in ${time}ms`);
    } catch (err) {
      console.error("Error saving collection items");
      console.error(err.stack);
    }
    this._saving = false;
  }
  async validate_save(new_file_path, old_file_path) {
    const new_file_size = (await this.adapter.stat(new_file_path))?.size;
    const old_file_size = (await this.adapter.stat(old_file_path))?.size;
    if(!old_file_size) return true;
    console.log("New file size: " + new_file_size + " bytes");
    console.log("Old file size: " + old_file_size + " bytes");
    return new_file_size > (old_file_size * 0.5);
  }

  // get file_name() { return super.file_name + '.ajson'; }
  get data_path() { return super.data_path + '/multi'; }
}

exports.ObsMultiAJSON = ObsMultiAJSON;