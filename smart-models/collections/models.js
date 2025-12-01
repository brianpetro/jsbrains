import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { Model } from '../items/model.js';

export class Models extends Collection {
  new_model(data = {}) {
    if(!data.provider_key) throw new Error('provider_key is required to create a new model');
    const item = new this.item_type(this.env, {
      ...data,
    });
    this.set(item);
    item.queue_save();
    item.emit_event('model:created');
    return item;
  }
  get default_provider_key() {
    throw new Error('default_provider_key not implemented');
  }

  get default_model_key() {
    if(!this.settings.default_model_key) {
      const new_default = this.new_model({ provider_key: this.default_provider_key }); // default provider
      new_default.queue_save();
      this.process_save_queue();
      this.settings.default_model_key = new_default.key;
    }
    return this.settings.default_model_key;
  }

  get default() {
    return this.get(this.default_model_key)
  }
}

export const models_collection = {
  class: Models,
  data_dir: 'models',
  data_adapter: ajson_single_file_data_adapter,
  item_type: Model,
  providers: {}
};

export default models_collection;
