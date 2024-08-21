import { ajson_merge } from '../utils/ajson_merge.js';
import { SmartCollectionAdapter } from './_adapter.js';
export class MultiFileSmartCollectionsAdapter extends SmartCollectionAdapter {

  get fs() { return this.collection.env.smart_env_settings.fs; }
  /**
   * @returns {string} The data path for folder that contains .ajson files.
   */
  // get data_path() { return this.collection.data_path + '/multi'; }
  get data_path() { return this.env.settings.env_data_dir + '/multi'; }

  /**
   * Asynchronously loads collection items from .ajson files within the specified data path.
   * It ensures that only .ajson files are processed and handles JSON parsing and item instantiation.
   */
  async load() {
    console.log("Loading collection items");
    const start = Date.now();
    if(!(await this.fs.exists(this.data_path))) await this.fs.mkdir(this.data_path);
    const collection_data_files = (await this.fs.list(this.data_path)); // List all files in the directory
    const vault_paths = this.collection.fs.files; // initiated in SmartFs.init()
    const item_types = [
      ...Object.keys(this.env.item_types),
      'SmartNote', // v1 backward compatibility
    ];
    for (const collection_item_data_file of collection_data_files) {
      const item_data_file_path = collection_item_data_file.path;
      if(!item_data_file_path.endsWith('.ajson')) continue; // ensure it's an .ajson file
      let source_is_deleted = false;
      try {
        const content = (await this.fs.read(item_data_file_path)).trim();
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
        if(source_is_deleted || !main_entity) await this.fs.remove(item_data_file_path);
        else if(main_entity.ajson !== content) {
          await this.fs.write(item_data_file_path, main_entity.ajson);
        }
      } catch (err) {
        console.log("Error loading file: " + item_data_file_path);
        console.log(err.stack); // stack trace
        // if parse error, remove file
        console.log(err.message);
        if(err.message.includes("Expected ")) await this.fs.remove(item_data_file_path);
      }
    }
    const end = Date.now(); // log time
    const time = end - start;
    console.log("Loaded collection items in " + time + "ms");
  }

  async save_item(key) {
    delete this.collection.save_queue[key];
    const item = this.collection.get(key);
    if(!item) return console.warn(`Item not found: ${key}, aborting save`);
    if(!(await this.fs.exists(this.data_path))) await this.fs.mkdir(this.data_path);
    try {
      const item_file_path = `${this.data_path}/${item.multi_ajson_file_name}.ajson`; // Use item.file_name for file naming
      if(item.deleted){
        // delete this.collection.items[key];
        this.collection.delete_item(key);
        if((await this.fs.exists(item_file_path))){
          await this.fs.remove(item_file_path);
          console.log("Deleted entity: " + key);
        }
      } else {
        const ajson = item.ajson;
        await this.fs.append(item_file_path, '\n' + ajson);
      }
    } catch (err) {
      if(err.message.includes("ENOENT")) return; // already deleted
      console.warn("Error saving collection item: ", key);
      console.warn(err.stack);
      item.queue_save();
    }
  }

  // override save_queue to log time
  async save_queue() {
    console.log("Saving " + this.collection.collection_name);
    const queue_length = Object.keys(this._save_queue).length;
    const start = Date.now();
    await super.save_queue();
    console.log(`Saved ${queue_length} ${this.collection.collection_name} in ${Date.now() - start}ms`);
  }
}