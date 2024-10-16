import { SmartHttpRequest } from "smart-http-request";
import platforms from "./platforms.json" assert { type: "json" };
import { SmartModel } from "smart-model";
export class SmartChatModel extends SmartModel {
  constructor(opts){
    super(opts);
    this._adapters = {};
    this._http_adapter = null;
  }
  async complete(req){ return await this.adapter.complete(req); }
  get_platforms_as_options(){ return Object.keys(platforms).map(key => ({ value: key })); }
  async get_models(refresh=false){ return await this.adapter.get_models(refresh); }
  async get_models_as_options(){
    const models = await this.adapter.get_models();
    return Object.values(models).map(model => ({ value: model.key }));
  }
  get_models_as_options_sync() {
    const models = this.adapter.models;
    return Object.values(models).map(model => ({ value: model.key }));
  }
  async stream(req, handlers={}){ return await this.adapter.stream(req, handlers); }
  stop_stream() { this.adapter.stop_stream(); }
  async count_tokens(input){ return await this.adapter.count_tokens(input); }
  re_render_settings(){
    if(this.opts.re_render_settings) this.opts.re_render_settings();
    else console.warn('No re-render settings function provided for SmartChatModel');
  }
  async test_api_key(){
    if(this.adapter.test_api_key) await this.adapter.test_api_key();
    this.re_render_settings();
  }
  get adapters() { return this.opts.adapters; }
  get adapter() { 
    if(!this._adapters[this.platform_key]){
      this._adapters[this.platform_key] = new this.adapters[this.platform_key](this);
    }
    return this._adapters[this.platform_key];
  }
  get http_adapter() {
    if(!this._http_adapter){
      if(this.opts.http_adapter) this._http_adapter = this.opts.http_adapter;
      else this._http_adapter = new SmartHttpRequest();
    }
    return this._http_adapter;
  }
  get platform() { return platforms[this.platform_key]; }
  get platform_key() {
    const platform_key = this.opts.platform_key // opts added at init take precedence
      || this.settings.platform_key // then settings
      || 'openai' // default to openai
    ;
    if(this.adapters[platform_key]) return platform_key;
    else {
      console.warn(`Platform ${platform_key} not supported, defaulting to openai`);
      return 'openai'; // default to openai if platform not supported
    }
  }
  get settings() { return this.opts.settings; }
  get settings_config() {
    const _settings_config = {
      platform_key: {
        name: 'Chat Model Platform',
        type: "dropdown",
        description: "Select a chat model platform to use with Smart Chat.",
        options_callback: 'get_platforms_as_options',
        is_scope: true, // trigger re-render of settings when changed
        callback: 're_render_settings',
      },
      "[CHAT_PLATFORM].model_key": {
        name: 'Chat Model',
        type: "dropdown",
        description: "Select a chat model to use with Smart Chat.",
        options_callback: 'get_models_as_options_sync',
        callback: 're_render_settings',
        conditional: (_this) => !local_platforms.includes(_this.settings.platform_key) && _this.settings.platform_key && _this.settings[_this.settings.platform_key]?.api_key,
      },
      "[CHAT_PLATFORM].api_key": {
        name: 'API Key',
        type: "password",
        description: "Enter your API key for the chat model platform.",
        callback: 'test_api_key',
        is_scope: true, // trigger re-render of settings when changed (reload models dropdown)
      },
      // LOCAL PLATFORM SETTINGS (probably should move to local adapter)
      "[CHAT_PLATFORM].model_name": {
        name: 'Model Name',
        type: "text",
        description: "Enter the model name for the chat model platform.",
        // callback: 'changed_chat_model',
        conditional: (_this) => local_platforms.includes(_this.settings.platform_key),
      },
      "[CHAT_PLATFORM].protocol": {
        name: 'Protocol',
        type: "text",
        description: "Enter the protocol for the local chat model.",
        // callback: 'changed_chat_model',
        conditional: (_this) => local_platforms.includes(_this.settings.platform_key),
      },
      "[CHAT_PLATFORM].hostname": {
        name: 'Hostname',
        type: "text",
        description: "Enter the hostname for the local chat model.",
        // callback: 'changed_chat_model',
        conditional: (_this) => local_platforms.includes(_this.settings.platform_key),
      },
      "[CHAT_PLATFORM].port": {
        name: 'Port',
        type: "number",
        description: "Enter the port for the local chat model.",
        // callback: 'changed_chat_model',
        conditional: (_this) => local_platforms.includes(_this.settings.platform_key),
      },
      "[CHAT_PLATFORM].path": {
        name: 'Path',
        type: "text",
        description: "Enter the path for the local chat model.",
        // callback: 'changed_chat_model',
        conditional: (_this) => local_platforms.includes(_this.settings.platform_key),
      },
      "[CHAT_PLATFORM].streaming": {
        name: 'Streaming',
        type: "toggle",
        description: "Enable streaming for the local chat model.",
        // callback: 'changed_chat_model',
        conditional: (_this) => local_platforms.includes(_this.settings.platform_key),
      },
      "[CHAT_PLATFORM].max_input_tokens": {
        name: 'Max Input Tokens',
        type: "number",
        description: "Enter the maximum number of input tokens for the chat model.",
        // callback: 'changed_chat_model',
        conditional: (_this) => local_platforms.includes(_this.settings.platform_key),
      },
      ...(this.adapter.settings_config || {}),
    }
    return this.process_settings_config(_settings_config);
  }
  process_setting_key(key) {
    return key.replace(/\[CHAT_PLATFORM\]/g, this.platform_key);
  }
}
const local_platforms = ['custom_local', 'ollama', 'lm_studio'];