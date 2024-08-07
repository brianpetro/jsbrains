const { ajson_merge } = require('../utils/ajson_merge.js');
class SmartCollectionsAdapter {
  constructor(main) {
    this.main = main;
  }
  get env() { return this.main.env; }
  get items() { return this.main.items; }

  /**
   * @returns {string} The data path for folder that contains .ajson files.
   */
  get data_path() { return this.main.data_path; }

  /**
   * Asynchronously loads collection items from .ajson files within the specified data path.
   * It ensures that only .ajson files are processed and handles JSON parsing and item instantiation.
   */
  async load() {
    console.log("Loading collection items");
    const start = Date.now();
    if(!(await this.exists(this.data_path))) await this.mkdir(this.data_path);
    const files = (await this.list(this.data_path)).files; // List all files in the directory
    const vault_paths = this.main.env.all_files.reduce((acc, file) => {
      acc[file.path] = file;
      return acc;
    }, {});
    const item_types = [
      ...Object.keys(this.env.item_types),
      'SmartNote', // v1 backward compatibility
    ];
    for (const file_path of files) {
      if(!file_path.endsWith('.ajson')) continue; // ensure it's an .ajson file
      let source_is_deleted = false;
      try {
        const content = (await this.read(file_path)).trim();
        const data = content
          .split('\n')
          .reduce((acc, line) => {
            const parsed = JSON.parse(`{${line}}`);
            if(Object.values(parsed)[0] === null){
              if(acc[Object.keys(parsed)[0]]) delete acc[Object.keys(parsed)[0]];
              return acc;
            }
            return ajson_merge(acc, parsed);
          }, {})
        ;
        let main_entity;
        Object.entries(data)
          .forEach(([ajson_key, value]) => {
            if(!value || source_is_deleted) return; // handle null values (deleted)
            let entity_key;
            let class_name = value.class_name; // DEPRECATED (moved to key so that multiple entities from different classes can have the same key)
            if(ajson_key.includes(":") && item_types.includes(ajson_key.split(":")[0])){
              class_name = ajson_key.split(":").shift();
              entity_key = ajson_key.split(":").slice(1).join(":"); // key is file path
            }else entity_key = ajson_key; // DEPRECATED: remove this
            const check_path = entity_key.includes("#") ? entity_key.split("#")[0] : entity_key;
            if(!vault_paths[check_path]){ // if not in vault path, it's a deleted item
              source_is_deleted = true;
              return;
            }
            if(value.class_name === 'SmartNote') value.class_name = "SmartSource"; // v1 backward compatibility (depended on by CollectionItem.collection_name)
            if(class_name === 'SmartNote') class_name = 'SmartSource'; // v1 backward compatibility
            const entity = new (this.env.item_types[class_name])(this.env, value);
            this.add_to_collection(entity);
            if(!entity_key.includes("#")) main_entity = entity;
          })
        ;
        if(source_is_deleted || !main_entity) await this.remove(file_path);
        else if(main_entity.ajson !== content) {
          await this.write(file_path, main_entity.ajson);
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

  add_to_collection(entity) {
    this.env[entity.collection_name].items[entity.key] = entity;
  }

  /**
   * Schedules a save operation to prevent multiple saves happening at the same time.
   */
  save() {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => { this._save_queue(); }, 3000);
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
      if(item.deleted){
        delete this.main.items[key];
        if((await this.exists(item_file_path))){
          await this.remove(item_file_path);
          console.log("Deleted entity: " + key);
        }
      } else {
        const ajson = item.ajson;
        await this.append(item_file_path, '\n' + ajson);
      }
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
    console.log("Saving " + this.main.collection_name);
    const start = Date.now();
    const batch_items = [];
    for (const key of Object.keys(this.main.save_queue)) {
      batch_items.push(this._save(key));
    }
    await Promise.all(batch_items);
    this._saving = false;
    this.main.save_queue = {};
    console.log(`Saved ${batch_items.length} ${this.main.collection_name} in ${Date.now() - start}ms`);
  }
}
exports.SmartCollectionsAdapter = SmartCollectionsAdapter;

