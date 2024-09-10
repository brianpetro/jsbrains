import { ajson_merge } from '../utils/ajson_merge.js';
import { SmartCollectionItemDataAdapter, SmartCollectionDataAdapter } from './_adapter.js';


// DO: replace this better way in future
const class_to_collection_name = {
  'SmartSource': 'smart_sources',
  'SmartNote': 'smart_sources', // DEPRECATED: added for backward compatibility
  'SmartBlock': 'smart_blocks',
  'SmartDirectory': 'smart_directories',
};

export class MultiFileSmartCollectionDataAdapter extends SmartCollectionDataAdapter {
  get fs() { return this.env.smart_env_settings.fs; }
  /**
   * @returns {string} The data folder that contains .ajson files.
   */
  get data_folder() { return 'multi'; }

  /**
   * Asynchronously loads collection item data from .ajson file specified by data_path.
   */
  async load(item) {
    const data_path = this.data_folder + this.fs.sep + item.multi_ajson_file_name + '.ajson';
    if(!(await this.fs.exists(this.data_folder))) await this.fs.mkdir(this.data_folder);
    try{
      const data_ajson = (await this.fs.read(data_path)).trim();
      if(!data_ajson){
        console.log("Data file not found: ", data_path, data_ajson);
        return item.queue_import(); // queue import and return early if data file missing or empty
      }
      const ajson_lines = data_ajson.split('\n');
      const parsed_data = ajson_lines
        .reduce((acc, line) => {
          try {
            const parsed = JSON.parse(`{${line}}`);
            if (Object.values(parsed)[0] === null) {
              if (acc[Object.keys(parsed)[0]]) delete acc[Object.keys(parsed)[0]];
              return acc;
            }
            return ajson_merge(acc, parsed);
          } catch (err) {
            console.warn("Error parsing line: ", line);
            console.warn(err.stack);
            return acc;
          }
        }, {});
      // array with same length as parsed_data
      const rebuilt_ajson = [];
      Object.entries(parsed_data)
        .forEach(([ajson_key, value], index) => {
          if (!value) return; // handle null values (deleted)
          rebuilt_ajson.push(`${JSON.stringify(ajson_key)}: ${JSON.stringify(value)}`);
          const [class_name, ...key_parts] = ajson_key.split(":");
          const entity_key = key_parts.join(":"); // key is file path
          if (entity_key === item.key) item.data = value;
          else {
            if (!this.env[class_to_collection_name[class_name]]) return console.warn(`Collection class not found: ${class_name}`);
            this.env[class_to_collection_name[class_name]].items[entity_key] = new this.env.item_types[class_name](this.env, value);
          }
        })
      ;
      item._queue_load = false;
      if (ajson_lines.length !== Object.keys(parsed_data).length) this.fs.write(data_path, rebuilt_ajson.join('\n'));
      item.loaded_at = Date.now();
    }catch(err){
      // if file not found, queue import
      if(err.message.includes("ENOENT")) return item.queue_import();
      console.log("Error loading collection item: ", item.key);
      console.warn(err.stack);
      item.queue_load();
      return;
    }
  }

  async save(item, ajson=null) {
    if(!ajson) ajson = item.ajson;
    if(!(await this.fs.exists(this.data_folder))) await this.fs.mkdir(this.data_folder);
    const data_path = this.data_folder + this.fs.sep + item.multi_ajson_file_name + '.ajson';
    try {
      if(item.deleted){
        this.collection.delete_item(item.key);
        if((await this.fs.exists(data_path))) await this.fs.remove(data_path);
      } else {
        await this.fs.append(data_path, '\n' + ajson); // prevent overwriting the file
      }
      item._queue_save = false;
      return true;
    } catch (err) {
      if(err.message.includes("ENOENT")) return; // already deleted
      console.warn("Error saving collection item: ", item.key);
      console.warn(err.stack);
      item.queue_save();
      return false;
    }
  }
}





export class MultiFileSmartCollectionItemDataAdapter extends SmartCollectionItemDataAdapter {
  get fs() { return this.env.smart_env_settings.fs; }
  /**
   * @returns {string} The data folder that contains .ajson files.
   */
  get data_folder() { return 'multi'; }
  /**
   * @returns {string} The data path for .ajson file.
   */
  get data_path() { return this.data_folder + this.fs.sep + this.item.multi_ajson_file_name + '.ajson'; }

  /**
   * Asynchronously loads collection item data from .ajson file specified by data_path.
   */
  async load() {
    try{
      const data_ajson = (await this.fs.read(this.data_path)).trim();
      if(!data_ajson){
        console.log("Data file not found: ", this.data_path, data_ajson);
        return this.item.queue_import(); // queue import and return early if data file missing or empty
      }
      const ajson_lines = data_ajson.split('\n');
      const parsed_data = ajson_lines
        .reduce((acc, line) => {
          try{
            const parsed = JSON.parse(`{${line}}`);
            if(Object.values(parsed)[0] === null){
              if(acc[Object.keys(parsed)[0]]) delete acc[Object.keys(parsed)[0]];
              return acc;
            }
            return ajson_merge(acc, parsed);
          }catch(err){
            console.warn("Error parsing line: ", line);
            console.warn(err.stack);
            return acc;
          }
        }, {})
      ;
      // array with same length as parsed_data
      const rebuilt_ajson = [];
      Object.entries(parsed_data)
        .forEach(([ajson_key, value], index) => {
          if(!value) return; // handle null values (deleted)
          rebuilt_ajson.push(`${JSON.stringify(ajson_key)}: ${JSON.stringify(value)}`);
          const [class_name, ...key_parts] = ajson_key.split(":");
          const entity_key = key_parts.join(":"); // key is file path
          if(entity_key === this.key) this.item.data = value;
          else {
            if(!this.env[class_to_collection_name[class_name]]) return console.warn(`Collection class not found: ${class_name}`);
            this.env[class_to_collection_name[class_name]].items[entity_key] = new this.env.item_types[class_name](this.env, value);
          }
        })
      ;
      this.item._queue_load = false;
      if(ajson_lines.length !== Object.keys(parsed_data).length) this.fs.write(this.data_path, rebuilt_ajson.join('\n'));
    }catch(err){
      // if file not found, queue import
      if(err.message.includes("ENOENT")) return this.item.queue_import();
      console.log("Error loading collection item: ", this.key);
      console.warn(err.stack);
      this.item.queue_load();
      return;
    }
  }

  async save() {
    if(!(await this.fs.exists(this.data_folder))) await this.fs.mkdir(this.data_folder);
    try {
      if(this.item.deleted){
        this.collection.delete_item(this.key);
        if((await this.fs.exists(this.data_path))) await this.fs.remove(this.data_path);
      } else {
        // await this.fs.write(this.data_path, this.item.ajson);
        await this.fs.append(this.data_path, '\n' + this.item.ajson); // prevent overwriting the file
        // console.log("Saved item: ", this.item.key, this.data_path);
      }
      this.item._queue_save = false;
      return true;
    } catch (err) {
      if(err.message.includes("ENOENT")) return; // already deleted
      console.warn("Error saving collection item: ", this.key);
      console.warn(err.stack);
      this.item.queue_save();
      return false;
    }
  }
}


/**
 * @deprecated use MultiFileSmartCollectionDataAdapter
 */
export class MultiFileSmartCollectionsAdapter {

  // get fs() { return this.collection.env.smart_env_settings.fs; }
  // /**
  //  * @returns {string} The data path for folder that contains .ajson files.
  //  */
  // // get data_path() { return this.collection.data_path + '/multi'; }
  // // get data_path() { return this.env.settings.env_data_dir + this.fs.sep + 'multi'; }
  // get data_path() { return 'multi'; }

  // /**
  //  * Asynchronously loads collection items from .ajson files within the specified data path.
  //  * It ensures that only .ajson files are processed and handles JSON parsing and item instantiation.
  //  */
  // async load() {
  //   console.log("Loading collection items");
  //   const start = Date.now();
  //   if(!(await this.fs.exists(this.data_path))) await this.fs.mkdir(this.data_path);
  //   const collection_data_files = (await this.fs.list_files(this.data_path)); // List all files in the directory
  //   const vault_paths = this.collection.fs.files; // initiated in SmartFs.init()
  //   const item_types = [
  //     ...Object.keys(this.env.item_types),
  //     'SmartNote', // v1 backward compatibility
  //   ];
  //   for (const collection_item_data_file of collection_data_files) {
  //     const item_data_file_path = collection_item_data_file.path;
  //     if(!item_data_file_path.endsWith('.ajson')) continue; // ensure it's an .ajson file
  //     let source_is_deleted = false;
  //     try {
  //       const content = (await this.fs.read(item_data_file_path)).trim();
  //       const data = content
  //         .split('\n')
  //         .reduce((acc, line) => {
  //           const parsed = JSON.parse(`{${line}}`);
  //           if(Object.values(parsed)[0] === null){
  //             if(acc[Object.keys(parsed)[0]]) delete acc[Object.keys(parsed)[0]];
  //             return acc;
  //           }
  //           return ajson_merge(acc, parsed);
  //         }, {})
  //       ;
  //       let main_entity;
  //       let main_entity_key;
  //       Object.entries(data)
  //         .forEach(([ajson_key, value]) => {
  //           if(!value || source_is_deleted) return; // handle null values (deleted)
  //           let entity_key;
  //           let class_name = value.class_name; // DEPRECATED (moved to key so that multiple entities from different classes can have the same key)
  //           if(ajson_key.includes(":") && item_types.includes(ajson_key.split(":")[0])){
  //             class_name = ajson_key.split(":").shift();
  //             entity_key = ajson_key.split(":").slice(1).join(":"); // key is file path
  //           }else entity_key = ajson_key; // DEPRECATED: remove this
  //           if(!main_entity_key) main_entity_key = entity_key.includes("#") ? entity_key.split("#")[0] : entity_key;
  //           if(!vault_paths[main_entity_key]){ // if not in vault path, it's a deleted item
  //             source_is_deleted = true;
  //             return;
  //           }
  //           if(value.class_name === 'SmartNote') value.class_name = "SmartSource"; // v1 backward compatibility (depended on by CollectionItem.collection_name)
  //           if(class_name === 'SmartNote') class_name = 'SmartSource'; // v1 backward compatibility
  //           const entity = new (this.env.item_types[class_name])(this.env, value);
  //           this.add_to_collection(entity);
  //           if(!entity_key.includes("#")) main_entity = entity;
  //         })
  //       ;
  //       if(source_is_deleted || !main_entity){
  //         await this.fs.remove(item_data_file_path);
  //       }else if(main_entity.ajson !== content) {
  //         await this.fs.write(item_data_file_path, main_entity.ajson);
  //       }
  //     } catch (err) {
  //       console.log("Error loading file: " + item_data_file_path);
  //       console.log(err.stack); // stack trace
  //       // if parse error, remove file
  //       console.log(err.message);
  //       if(err.message.includes("Expected ")) await this.fs.remove(item_data_file_path);
  //     }
  //   }
  //   const end = Date.now(); // log time
  //   const time = end - start;
  //   console.log("Loaded collection items in " + time + "ms");
  // }

  // async save_item(key) {
  //   delete this.collection.save_queue[key];
  //   const item = this.collection.get(key);
  //   if(!item) return console.warn(`Item not found: ${key}, aborting save`);
  //   if(!(await this.fs.exists(this.data_path))) await this.fs.mkdir(this.data_path);
  //   try {
  //     const item_file_path = `${this.data_path}/${item.multi_ajson_file_name}.ajson`; // Use item.file_name for file naming
  //     if(item.deleted){
  //       // delete this.collection.items[key];
  //       this.collection.delete_item(key);
  //       if((await this.fs.exists(item_file_path))){
  //         await this.fs.remove(item_file_path);
  //         console.log("Deleted entity: " + key);
  //       }
  //     } else {
  //       const ajson = item.ajson;
  //       await this.fs.append(item_file_path, '\n' + ajson);
  //     }
  //   } catch (err) {
  //     if(err.message.includes("ENOENT")) return; // already deleted
  //     console.warn("Error saving collection item: ", key);
  //     console.warn(err.stack);
  //     item.queue_save();
  //   }
  // }

  // // override save_queue to log time
  // async save_queue() {
  //   console.log("Saving " + this.collection.collection_name);
  //   const queue_length = Object.keys(this._save_queue).length;
  //   const start = Date.now();
  //   await super.save_queue();
  //   console.log(`Saved ${queue_length} ${this.collection.collection_name} in ${Date.now() - start}ms`);
  // }
}