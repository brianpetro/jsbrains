import { SmartSources } from "smart-sources";
import { render as chat_template } from "./components/threads.js";
import { render as settings_template } from "./components/settings.js";

/**
 * @class SmartThreads
 * @extends SmartSources
 * @description Collection class for managing chat threads. Handles thread creation,
 * rendering, chat model integration, and settings management. Provides centralized
 * control for all chat-related operations.
 */
export class SmartThreads extends SmartSources {
  /**
   * Initializes the file system and preloads chat models
   * @async
   */
  async init() {
    await this.fs.init();
  }

  /**
   * Renders the chat interface
   * @async
   * @param {HTMLElement} [container] - Container element to render into
   * @param {Object} [opts={}] - Rendering options
   * @returns {DocumentFragment} Rendered chat interface
   */
  async render(container=this.container, opts={}) {
    if(Object.keys(opts).length > 0) this.render_opts = opts; // persist render options for future renders (not ideal, but required since declaring render_opts outside of this class)
    if(container && (!this.container || this.container !== container)) this.container = container;
    const frag = await chat_template.call(this.smart_view, this, this.render_opts);
    container.innerHTML = '';
    container.appendChild(frag);
    return frag;
  }

  get chat_model_settings() {
    if(!this.env.settings.chat_model) this.env.settings.chat_model = {};
    return this.env.settings.chat_model;
  }
  /**
   * @property {Object} chat_model - The AI chat model instance
   * @readonly
   */
  get chat_model() {
    if (!this._chat_model) {
      this._chat_model = this.env.init_module('smart_chat_model', {
        model_config: {},
        settings: this.chat_model_settings,
        env: this.env,
        reload_model: this.reload_chat_model.bind(this),
      });
    }
    return this._chat_model;
  }
  reload_chat_model() {
    console.log("reload_chat_model");
    this.chat_model.unload();
    this._chat_model = null;
    this.render_settings();
  }

  get container() { return this._container; }
  set container(container) { this._container = container; }

  /**
   * @property {SmartThread} current - The currently active chat thread
   */
  get current() { return this._current; }
  set current(thread) { this._current = thread; }

  /**
   * @property {string} data_folder - Path to chat history storage
   * @readonly
   */
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + ".smart-env/chats"; }

  /**
   * @property {Object} default_settings - Default configuration for models
   * @readonly
   * @returns {Object} settings - Default settings object containing:
   * @returns {Object} settings.chat_model - Chat model configuration
   * @returns {string} settings.chat_model.adapter - Default adapter
   * @returns {Object} settings.chat_model.openai - OpenAI-specific settings
   * @returns {Object} settings.embed_model - Embedding model configuration
   */
  get default_settings() {
    return {
      chat_model: {
        adapter: 'openai',
        openai: {
          model_key: 'gpt-4o',
        },
      },
      embed_model: {
        model_key: 'None',
      },
    };
  }

  /**
   * @property {Object} fs - File system interface for chat data
   * @readonly
   */
  get fs() {
    if(!this._fs){
      this._fs = new this.env.opts.modules.smart_fs.class(this.env, {
        adapter: this.env.opts.modules.smart_fs.adapter,
        fs_path: this.data_folder,
      });
    }
    return this._fs;
  }

  // /**
  //  * @property {Function} render_settings_component - Template for settings UI
  //  * @readonly
  //  */
  // get render_settings_component() {
  //   return settings_template.bind(this.smart_view);
  // }
  async render_settings(container=this.settings_container) {
    if(!this.settings_container || container !== this.settings_container) this.settings_container = container;
    await this.chat_model.render_settings(this.settings_container);
  }

  /**
   * @property {Object} settings_config - Processed settings configuration
   * @readonly
   */
  get settings_config() {
    // return this.process_settings_config(this.chat_model.settings_config, `chat_model`);
    // return this.chat_model.settings_config;
    return {};
  }
}