const { SmartCollectionsAdapter } = require('./adapter.js');
const { deep_merge } = require('../utils/ajson_merge.js');
/**
 * Adapter for Obsidian that handles multiple .ajson files.
 */
class ObsidianAdapter extends SmartCollectionsAdapter {
  /**
   * Creates an instance of ObsidianAdapter.
   * @param {Object} main - The main instance of the smart-collections-2 plugin.
   */
  constructor(main) {
    super(main);
    this.obsidian_adapter = this.main.env.plugin.app.vault.adapter;
  }
  async mkdir(path) { return await this.obsidian_adapter.mkdir(path); }
  async read(path) { return await this.obsidian_adapter.read(path); }
  async write(path, data) { return await this.obsidian_adapter.write(path, data); }
  async list(path) { return await this.obsidian_adapter.list(path); }
  async exists(path) { return await this.obsidian_adapter.exists(path); }
  async stat(path) { return await this.obsidian_adapter.stat(path); }
  async append(path, data) { return await this.obsidian_adapter.append(path, data); }
  async remove(path) { return await this.obsidian_adapter.remove(path); }
  /**
   * Asynchronously loads collection items from .ajson files within the specified data path.
   * It ensures that only .ajson files are processed and handles JSON parsing and item instantiation.
   */
  async load() {
    console.log("Loading collection items");
    const start = Date.now();
    if(!(await this.exists(this.data_path))) await this.mkdir(this.data_path);
    const files = (await this.list(this.data_path)).files; // List all files in the directory
    for (const file_path of files) {
      try {
        if (file_path.endsWith('.ajson')) { // Ensure it's an .ajson file
          const content = (await this.read(file_path)).trim();
          const data = content
            .split('\n')
            .reduce((acc, line) => {
              // if(line.endsWith(',')) line = line.slice(0, -1); // DEPRECATED: should not be necessary
              const parsed = JSON.parse(`{${line}}`);
              // future: parse key to allow dot notation
              return deep_merge(acc, parsed);
            }, {})
          ;
          // const data = JSON.parse(`{${content.startsWith(',\n') ? content.slice(1) : content}}`);
          let main_item = null;
          let updated_content = '';
          Object.entries(data).forEach(([key, value]) => {
            if(!value) return; // handle null values (deleted)
            let class_name = value.class_name; // DEPRECATED (moved to key so that multiple entities from different classes can have the same key)
            if(key.includes(":") && key.split(":")[0] in this.env.item_types){
              class_name = key.split(":").shift();
              key = key.split(":").slice(1).join(":");
            }
            updated_content += `${JSON.stringify(class_name + ":" + key)}: ${JSON.stringify(value)}\n`;
            const entity = new (this.env.item_types[class_name])(this.env, value);
            this.env[entity.collection_name].items[key] = entity;
            if(!key.includes("#")) main_item = entity;
          });
          updated_content = updated_content.trim();
          if(!main_item) await this.remove(file_path);
          else if(updated_content !== content) {
            // console.log("data: ", data);
            await this.write(file_path, updated_content);
            // console.log("Updated file: " + file_path);
          }
        }
      } catch (err) {
        console.log("Error loading file: " + file_path);
        console.log(err.stack); // stack trace
        // if parse error, remove file
        console.log(err.message);
        if(err.message.includes("Expected ")) await this.remove(file_path);
      }
    }
    const end = Date.now(); // log time
    const time = end - start;
    console.log("Loaded collection items in " + time + "ms");
  }

  /**
   * Schedules a save operation to prevent multiple saves happening at the same time.
   */
  save() {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => { this._save(); }, 10000);
  }

  /**
   * Asynchronously saves modified collection items to their respective .ajson files.
   * @param {boolean} [force=false] - Forces the save operation even if it's currently flagged as saving.
   */
  async _save(key) {
    delete this.main.save_queue[key];
    const item = this.main.get(key);
    if(!item) return console.warn("Item not found: " + key);
    if(!(await this.exists(this.data_path))) await this.mkdir(this.data_path);
    try {
      const item_file_path = `${this.data_path}/${item.multi_ajson_file_name}.ajson`; // Use item.file_name for file naming
      const ajson = item.ajson;
      if(!ajson && (await this.exists(item_file_path))){
        await this.remove(item_file_path);
        delete this.main.items[key];
      }
      else await this.append(item_file_path, '\n' + ajson);
    } catch (err) {
      if(err.message.includes("ENOENT")) return; // already deleted
      console.warn("Error saving collection item: ", key);
      console.warn(err.stack);
      item.queue_save();
    }
  }
  async _save_queue() {
    if(this._saving) return console.log("Already saving");
    this._saving = true; // prevent multiple saves at once
    setTimeout(() => { this._saving = false; }, 10000); // set _saving to false after 10 seconds
    console.log("Saving collection items");
    const start = Date.now();
    const batch_items = [];
    for (const key of Object.keys(this.main.save_queue)) {
      batch_items.push(this._save(key));
    }
    await Promise.all(batch_items);
    this._saving = false;
    console.log(`Saved ${batch_items.length} collection items in ${Date.now() - start}ms`);
  }

  // /**
  //  * Validates the save operation by comparing the file sizes of the new and old files.
  //  * @param {string} new_file_path - Path to the new file.
  //  * @param {string} old_file_path - Path to the old file.
  //  * @returns {Promise<boolean>} - True if the new file size is at least 50% of the old file size, otherwise false.
  //  */
  // async validate_save(new_file_path, old_file_path) {
  //   const new_file_size = (await this.stat(new_file_path))?.size;
  //   const old_file_size = (await this.stat(old_file_path))?.size;
  //   if(!old_file_size) return true;
  //   console.log("New file size: " + new_file_size + " bytes");
  //   console.log("Old file size: " + old_file_size + " bytes");
  //   return new_file_size > (old_file_size * 0.5);
  // }
}

exports.ObsidianAdapter = ObsidianAdapter;