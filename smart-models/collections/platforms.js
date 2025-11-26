import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { Platform } from '../items/platform.js';

export class Platforms extends Collection {
}

export const platforms_collection = {
  class: Platforms,
  data_dir: 'platforms',
  data_adapter: ajson_single_file_data_adapter,
  item_type: Platform,
  model_platform_adapters: {}
};

export default platforms_collection;
