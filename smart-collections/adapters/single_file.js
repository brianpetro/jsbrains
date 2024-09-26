/**
 * THIS ADAPTER NEEDS MORE TESTING AND LOGIC VALIDATION
 */
import { ajson_merge } from '../utils/ajson_merge.js';
import { SmartCollectionItemDataAdapter } from './_adapter.js';


// DO: replace this better way in future
const class_to_collection_key = {
  'SmartSource': 'smart_sources',
  'SmartBlock': 'smart_blocks',
  'SmartDirectory': 'smart_directories',
};
export class SingleFileSmartCollectionDataAdapter extends SmartCollectionItemDataAdapter {
  get fs() { return this.collection.data_fs || this.env.data_fs; }
  /**
   * @returns {string} The data folder that contains .ajson files.
   */
  get data_folder() { return 'single'; }
  /**
   * @returns {string} The data path for .ajson file.
   */
  get data_path() { return this.data_folder + this.fs.sep + this.collection_key + '.ajson'; }

  /**
   * Asynchronously loads collection item data from .ajson file specified by data_path.
   */
  async load() {
    if(this.collection.is_loading) return;
    this.collection.is_loading = true;
    try{
      const data_ajson = (await this.fs.read(this.data_path)).trim();
      const parsed_data = data_ajson
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
      // array with same length as parsed_data
      const rebuilt_ajson = Array(Object.keys(parsed_data).length).fill(null);
      Object.entries(parsed_data)
        .forEach(([ajson_key, value], index) => {
          if(!value) return; // handle null values (deleted)
          rebuilt_ajson[index] = `${JSON.stringify(ajson_key)}: ${JSON.stringify(value)}`;
          const [class_name, ...key_parts] = ajson_key.split(":");
          const entity_key = key_parts.join(":"); // key is file path
          const collection = this.env[class_to_collection_key[class_name]];
          if(!collection) return console.warn(`Collection class not found: ${class_name}`);
          if(collection.items[entity_key]) collection.items[entity_key].data = value;
          else collection.items[entity_key] = new this.env.item_types[class_name](this.env, value);
        })
      ;
      const rebuilt_ajson_str = rebuilt_ajson.join('\n');
      if(data_ajson !== rebuilt_ajson_str) await this.fs.write(this.data_path, rebuilt_ajson_str);
    } catch (err) {
      console.warn("Error loading collection: ", this.collection_key);
      console.warn(err.stack);
    } finally {
      this.collection.is_loading = false;
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