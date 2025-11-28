import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { Model } from '../items/model.js';
import { ChatCompletionModelTypeAdapter } from '../adapters/model-type/chat_completion.js';
import { EmbeddingModelTypeAdapter } from '../adapters/model-type/embedding.js';

export class Models extends Collection {
  get model_type_adapters() {
    return this.opts.model_type_adapters || models_collection.model_type_adapters;
  }
  async process_load_queue () {
    await super.process_load_queue();
    // for each adapter
    for(const [key, AdapterClass] of Object.entries(this.model_type_adapters)) {
      // run static init (adds default items, etc)
      AdapterClass.init(this);
    }
  }
  new_model(data = {}) {
    if(!data.platform_key) throw new Error('platform_key is required to create a new model');
    if(!data.model_type) throw new Error('model_type is required to create a new model');
    const platform = this.env.platforms.get(data.platform_key);
    if(!platform) {
      this.env.platforms.new_platform({ key: data.platform_key });
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
  model_type_adapters: {
    chat_completion: ChatCompletionModelTypeAdapter,
    embedding: EmbeddingModelTypeAdapter,
  },
};

export default models_collection;
