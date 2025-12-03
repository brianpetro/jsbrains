import {Models, settings_config} from './models.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { RankingModel } from '../items/ranking_model.js';
import cohere from "../adapters/ranking/cohere.js";

export class RankingModels extends Models {
  model_type = 'Ranking';
  get default_provider_key() {
    return 'cohere';
  }
}

export const ranking_models_collection = {
  class: RankingModels,
  data_dir: 'ranking_models',
  collection_key: 'ranking_models',
  data_adapter: ajson_single_file_data_adapter,
  item_type: RankingModel,
  providers: {
    cohere
  },
  settings_config
};

export default ranking_models_collection;
