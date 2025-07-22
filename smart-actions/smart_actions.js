import { Collection } from 'smart-collections';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { SmartActionAdapter } from './adapters/_adapter.js';
import { SmartAction } from './smart_action.js';

export class SmartActions extends Collection {
  collection_key = "smart_actions";
  static collection_key = "smart_actions";
  data_dir = 'smart_actions';
  async init() {
    Object.entries(this.opts.default_actions).forEach(async ([action_key, module]) => {
      await this.register_included_module(action_key, module);
    });
  }
  async register_included_module(action_key, module){
    const action = await this.create_or_update({
      key: action_key,
      source_type: 'included',
    });
    action.module = module;
    return action;
  }

}

export default {
  class: SmartActions,
  item_type: SmartAction,
  data_adapter: ajson_single_file_data_adapter,
  action_adapters: {
    default: SmartActionAdapter,
  },
};