import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { Model } from '../items/model.js';

export class Models extends Collection {
}

export const models_collection = {
  class: Models,
  data_dir: 'models',
  data_adapter: ajson_single_file_data_adapter,
  item_type: Model,
  model_type_adapters: {}
};

export default models_collection;
