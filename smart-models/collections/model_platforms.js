import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { ModelPlatform } from '../items/model_platform.js';

export class ModelPlatforms extends Collection {
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

export const model_platforms_collection = {
  class: ModelPlatforms,
  data_dir: 'model_platforms',
  data_adapter: ajson_single_file_data_adapter,
  item_type: ModelPlatform,
  model_platform_adapters: {}
};

export default model_platforms_collection;
