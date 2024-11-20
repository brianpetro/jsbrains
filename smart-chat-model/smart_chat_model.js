import { SmartModel } from "smart-model";
import { render as render_settings_component } from "./components/settings.js";

/**
 * SmartChatModel - A versatile class for handling chat operations using various platform adapters.
 * @extends SmartModel
 * 
 * @example
 * ```javascript
 * const chatModel = new SmartChatModel({
 *   platform_key: 'openai',
 *   adapters: {
 *     openai: OpenAIAdapter,
 *     custom_local: LocalAdapter,
 *   },
 *   settings: {
 *     openai: { api_key: 'your-api-key' },
 *     custom_local: { hostname: 'localhost', port: 8080 },
 *   },
 * });
 * 
 * const response = await chatModel.complete({ prompt: "Hello, world!" });
 * console.log(response);
 * ```
 */
export class SmartChatModel extends SmartModel {
  /**
   * Create a SmartChatModel instance.
   * @param {Object} opts - Configuration options
   * @param {string} [opts.platform_key] - Platform key to use
   * @param {string} [opts.model_key] - Model key to use
   * @param {Object} opts.adapters - Map of adapter names to adapter classes
   * @param {Object} opts.settings - Model settings configuration
   */
  constructor(opts = {}) {
    super(opts);
  }

  /**
   * Get the adapter name.
   * @returns {string} Current platform key
   */
  get adapter_name() { return this.platform_key; }

  /**
   * Get available models.
   * @returns {Object} Map of model objects
   */
  get models() { return this.adapter.models; }
  
  get can_stream() { return this.adapter.constructor.defaults.streaming; }
  get can_use_tools() {
    return this.adapter.constructor.defaults.can_use_tools;
  }

  /**
   * Complete a chat request.
   * @param {Object} req - Request parameters
   * @returns {Promise<Object>} Completion result
   */
  async complete(req) {
    return await this.invoke_adapter_method('complete', req);
  }

  /**
   * Stream chat responses.
   * @param {Object} req - Request parameters
   * @param {Object} handlers - Event handlers for streaming
   * @returns {Promise<string>} Complete response text
   */
  async stream(req, handlers = {}) {
    return await this.invoke_adapter_method('stream', req, handlers);
  }

  /**
   * Stop active stream.
   */
  stop_stream() {
    this.invoke_adapter_method('stop_stream');
  }

  /**
   * Count tokens in input text.
   * @param {string|Object} input - Text to count tokens for
   * @returns {Promise<number>} Token count
   */
  async count_tokens(input) {
    return await this.invoke_adapter_method('count_tokens', input);
  }

  /**
   * Get platforms as dropdown options.
   * @returns {Array<Object>} Array of {value, name} option objects
   */
  get_platforms_as_options() {
    console.log('get_platforms_as_options', this.adapters);
    return Object.entries(this.adapters).map(([key, AdapterClass]) => ({ value: key, name: AdapterClass.defaults.description || key }));
  }

  /**
   * Test if API key is valid.
   * @returns {Promise<boolean>} True if API key is valid
   */
  async test_api_key() {
    await this.invoke_adapter_method('test_api_key');
    this.render_settings();
  }

  /**
   * Get current platform configuration.
   * @returns {Object} Platform configuration object
   */
  get platform() {
    const AdapterClass = this.adapters[this.platform_key];
    if (!AdapterClass) {
      throw new Error(`Platform "${this.platform_key}" not supported`);
    }
    return AdapterClass.defaults;
  }

  /**
   * Get current platform key.
   * @returns {string} Platform key
   */
  get platform_key() {
    const platform_key = this.opts.platform_key // opts added at init take precedence
      || this.settings.platform_key // then settings
      || 'open_router'; // default to open_router

    if (this.adapters[platform_key]) {
      return platform_key;
    } else {
      console.warn(`Platform "${platform_key}" not supported, defaulting to "open_router".`);
      return 'open_router'; // default to open_router if platform not supported
    }
  }

  /**
   * Get default model key.
   * @returns {string} Default model key
   */
  get default_model_key() {
    return this.adapter.constructor.defaults.default_model;
  }

  /**
   * Get current settings.
   * @returns {Object} Settings object
   */
  get settings() {
    return this.opts.settings;
  }

  /**
   * Reload model.
   */
  reload_model() {
    console.log('reload_model', this.opts);
    if(this.opts.reload_model) this.opts.reload_model();
  }

  /**
   * Get settings configuration.
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    const _settings_config = {
      platform_key: {
        name: 'Chat Model Platform',
        type: "dropdown",
        description: "Select a chat model platform to use with Smart Chat.",
        options_callback: 'get_platforms_as_options',
        is_scope: true, // trigger re-render of settings when changed
        callback: 'reload_model',
        default: 'open_router',
      },
      // Merge adapter-specific settings
      ...(this.adapter.settings_config || {}),
    };

    return this.process_settings_config(_settings_config);
  }

  /**
   * Process setting key.
   * @param {string} key - Setting key
   * @returns {string} Processed key
   */
  process_setting_key(key) {
    return key.replace(/\[CHAT_ADAPTER\]/g, this.adapter_name);
  }

  /**
   * Get settings component renderer.
   * @returns {Function} Settings component renderer
   */
  get render_settings_component() {
    return (typeof this.opts.components?.settings === 'function'
      ? this.opts.components.settings
      : render_settings_component
    ).bind(this.smart_view);
  }

  /**
   * Get smart view instance.
   * @returns {SmartView} Smart view instance
   */
  get smart_view() {
    if(!this._smart_view) this._smart_view = this.opts.env.init_module('smart_view'); // Decided: how to better handle this? Should still avoid direct dependency so can re-use platform-level adapters
    return this._smart_view;
  }

  /**
   * Render settings.
   * @param {HTMLElement} [container] - Container element
   * @param {Object} [opts] - Render options
   * @returns {Promise<HTMLElement>} Container element
   */
  async render_settings(container=this.settings_container, opts = {}) {
    if(!this.settings_container || container !== this.settings_container) this.settings_container = container;
    if(!container) throw new Error("Container is required");
    container.innerHTML = '';
    container.innerHTML = '<div class="sc-loading">Loading ' + this.adapter_name + ' settings...</div>';
    const frag = await this.render_settings_component(this, opts);
    container.innerHTML = '';
    container.appendChild(frag);
    this.smart_view.on_open_overlay(container);
    return container;
  }
}
