import fs from 'fs';
import { SmartCollectionAdapter } from './_adapter.js';
export class TestSmartCollectionAdapter extends SmartCollectionAdapter{
  constructor(collection) {
    super(collection);
    this.test_data = JSON.parse(fs.readFileSync(this.data_path, 'utf8'));
  }
  get data_path() { return "./test/_data.json"; }
  async load() {
    // console.log("Loading test collection...");
    Object.entries(this.test_data).forEach(([ajson_key, value]) => {
      const [class_name, key] = ajson_key.split(":");
      const entity = new (this.env.item_types[class_name])(this.env, value);
      // if value has content, this.collection.fs.write()
      if(value.content) this.collection.fs.write(key, value.content);
      this.add_to_collection(entity);
    });
    // console.log("Loaded test collection");
  }
  async save_item(key) {
    delete this._save_queue[key];
    const item = this.collection.get(key);
    if(!item) return console.warn("Item not found: " + key);
    if(!item.deleted) this.test_data[key] = item.ajson;
    else {
      delete this.test_data[key];
      this.collection.delete_item(key);
    }
  }
}