import { SmartThreadDataAdapter } from "./_adapter.js";

/**
 * @class SmartThreadJsonDataAdapter
 * @extends SmartThreadDataAdapter
 * @description for persisting OpenAI chat completion responses to JSON files
 */
export class SmartThreadJsonDataAdapter extends SmartThreadDataAdapter {
  static extension = 'json';
  extension = 'json';
  get file_path() {
    if(!this.data.path){
      if(!this.data.created_at) this.data.created_at = Date.now();
      this.data.path = this.item.collection.source_dir + '/' + this.data.created_at + '.' + this.extension;
    }
    return this.data.path;
  }
  to_source_data(){
    return JSON.stringify({
      ...this.item.data,
      blocks: this.item.blocks.map(block => ({...block.data, key: block.key})),
    }, null, 2);
  }
  from_source_data(source_data) {
    const parsed_data = JSON.parse(source_data);
    this.item.data = {...parsed_data, blocks: undefined};
    parsed_data.blocks.forEach(block => {
      this.item.env.smart_messages.items[block.key] = new this.item.env.smart_messages.item_type(
        this.item.env,
        block
      );
    });
  }
}