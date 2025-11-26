import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { Platform } from '../items/platform.js';

export class Platforms extends Collection {
  new_platform(data = {}) {
    if(!data.adapter_key) throw new Error('adapter_key is required to create a new platform');
    const item = new this.item_type(this.env, {
      ...data,
    });
    this.set(item);
    item.queue_save();
    item.emit_event('platform:created');
    return item;
  }
}

export const platforms_collection = {
  class: Platforms,
  data_dir: 'platforms',
  data_adapter: ajson_single_file_data_adapter,
  item_type: Platform,
  model_platform_adapters: {}
};

export default platforms_collection;
