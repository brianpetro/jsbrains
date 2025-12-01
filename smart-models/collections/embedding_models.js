import {Models} from './models.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { EmbeddingModel } from '../items/embedding_model.js';

export class EmbeddingModels extends Models {

  get default() {
    const key = Object.keys(this.items)
      .sort((a, b) => b - a)[0] // sort desc
    ;
    return this.get(key);
  }
}

export const embedding_models_collection = {
  class: EmbeddingModels,
  data_dir: 'embedding_models',
  data_adapter: ajson_single_file_data_adapter,
  item_type: EmbeddingModel,
  provider_adapters: {
    transformers
  }
};