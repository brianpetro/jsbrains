import { Collection } from 'smart-collections';

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
  async register_mjs_action(file_path) {
    if(typeof file_path !== 'string') return;
    const action_key = path.basename(file_path, '.mjs');
    const source_type = 'mjs';
    return await this.create_or_update({
      key: action_key,
      source_type,
      file_path,
    });
  }
  async register_cjs_action(file_path) {
    const action_key = path.basename(file_path, '.js');
    const source_type = 'cjs';
    return this.create_or_update({
      key: action_key,
      source_type,
      file_path,
    });
  }

  get default_pre_processes() { return Object.values(this.opts.default_pre_processes || {}); }
  get default_post_processes() { return Object.values(this.opts.default_post_processes || {}); }

  // v1 backwards compatibility
  get custom_actions() {
    return Object.values(this.items).filter(a => a.data.file_path);
  }
  get action_groups_official() {
    return Object.values(this.env.smart_action_groups.items || {})
      .filter(g => g.key !== 'test')
      .filter(g => g.official === true);
  }
  get action_groups_custom() {
    return Object.values(this.env.smart_action_groups.items || {})
      .filter(g => g.key !== 'test')
      .filter(g => g.official !== true)
      .sort((a, b) => {
        if (a.key === 'default') return -1;
        if (b.key === 'default') return 1;
        return a.key.localeCompare(b.key);
      });
  }
}

