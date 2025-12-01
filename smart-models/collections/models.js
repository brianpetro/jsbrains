import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { Model } from '../items/model.js';

export class Models extends Collection {
  new_model(data = {}) {
    if(!data.provider_key) throw new Error('provider_key is required to create a new model');
    const provider = this.env.providers.get(data.provider_key);
    if(!provider) {
      this.env.providers.new_provider({ key: data.provider_key });
    }
    const item = new this.item_type(this.env, {
      ...data,
    });
    this.set(item);
    item.queue_save();
    item.emit_event('model:created');
    return item;
  }
}

export const models_collection = {
  class: Models,
  data_dir: 'models',
  data_adapter: ajson_single_file_data_adapter,
  item_type: Model,
};

export default models_collection;
