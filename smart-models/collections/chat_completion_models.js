import {Models} from './models.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { ChatCompletionModel } from '../items/chat_completion_model.js';
import open_router from "../adapters/chat-completion/open_router.js";

export class ChatCompletionModels extends Models {
  get default_provider_key() {
    return 'open_router';
  }
}

export const chat_completion_models_collection = {
  class: ChatCompletionModels,
  data_dir: 'chat_completion_models',
  data_adapter: ajson_single_file_data_adapter,
  item_type: ChatCompletionModel,
  providers: {
    open_router
  }
};

export default chat_completion_models_collection;