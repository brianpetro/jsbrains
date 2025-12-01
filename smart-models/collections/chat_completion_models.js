import {Models} from './models.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { ChatCompletionModel } from '../items/chat_completion_model.js';
import open_router from "../adapters/embedding/open_router.js";

export class ChatCompletionModels extends Models {

  get default() {
    const key = Object.keys(this.items)
      .sort((a, b) => b - a)[0] // sort desc
    ;
    return this.get(key);
  }
}

export const chat_completion_models_collection = {
  class: ChatCompletionModels,
  data_dir: 'chat_completion_models',
  data_adapter: ajson_single_file_data_adapter,
  item_type: ChatCompletionModel,
  provider_adapters: {
    open_router
  }
};

export default chat_completion_models_collection;