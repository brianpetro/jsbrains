import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { Model } from '../items/model.js';
import { ChatCompletionModelTypeAdapter } from '../adapters/model-type/chat_completion.js';
import { EmbeddingModelTypeAdapter } from '../adapters/model-type/embedding.js';

export class Models extends Collection {
  get model_type_adapters() {
    return this.opts.model_type_adapters || models_collection.model_type_adapters;
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
