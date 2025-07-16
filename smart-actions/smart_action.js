import { CollectionItem } from 'smart-collections';
export class SmartAction extends CollectionItem {
  static collection_key = 'smart_actions';
  collection_key = 'smart_actions';
  async init() {
    if(!this.action_adapter) {
      delete this.collection.items[this.key];
      return;
    }
    await this.action_adapter.load();
  }
  async run_action(params = {}) {
    params = await this.pre_process(params);
    let result = await this.action_adapter.run(params);
    result = await this.post_process(params, result);
    return result;
  }

  async pre_process(params) {
    for(const pre_process of this.action_pre_processes){
      params = await pre_process.call(this, params);
    }
    return params;
  }
  async post_process(params, result) {
    for(const post_process of this.action_post_processes){
      result = await post_process.call(this, params, result);
    }
    return result;
  }

  get action_adapters() { return this.collection.opts.action_adapters; }
  // Decide which adapter based on data.source_type:
  get action_adapter() {
    if(!this._action_adapter) {
      const adapter = this.action_adapters[this.source_type] || this.action_adapters.default;
      this._action_adapter = new adapter(this);
    }
    return this._action_adapter;
  }
  get action_post_processes() { return Object.values(this.module?.post_processes || {}); }
  get action_pre_processes() { return Object.values(this.module?.pre_processes || {}); }
  get active() { return this.data.active !== false; }
  set active(val) { this.data.active = !!val; }
  get endpoint() { return Object.keys(this.module.openapi?.paths || {})[0] || `/${this.key}`; }
  get module() { return this.action_adapter.module; }
  set module(module) { this.action_adapter.module = module; }
  get openapi() { return this.module.openapi; }
  get settings() {
    if(!this.env.settings.smart_actions) this.env.settings.smart_actions = {};
    if(!this.env.settings.smart_actions[this.key]) this.env.settings.smart_actions[this.key] = {};
    return this.env.settings.smart_actions[this.key];
  }
  get source_type() { return this.data.source_type; }

  /**
   * OpenAI tool definition for this action.
   * Delegates to the action adapter.
   * @returns {object|null}
   */
  get as_tool() { return this.action_adapter.as_tool; }

}
