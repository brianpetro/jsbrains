import {Models, settings_config} from './models.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { EmbeddingModel } from '../items/embedding_model.js';

export class EmbeddingModels extends Models {
  model_type = 'Embedding';
  get default_provider_key() {
    return 'transformers';
  }
}

export { settings_config };

export const embedding_models_collection = {
  class: EmbeddingModels,
  data_dir: 'embedding_models',
  collection_key: 'embedding_models',
  data_adapter: ajson_single_file_data_adapter,
  item_type: EmbeddingModel,
  providers: {
    // transformers // replace with platform-specific import in obsidian-smart-env
  },
  settings_config
};
export default embedding_models_collection;