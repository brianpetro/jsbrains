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
   * @inheritdoc SmartModel
   * @param {Object} opts - Configuration options.
   * @param {string} [opts.platform_key] - Platform key to use.
   * @param {string} [opts.model_key] - Model key to use.
   * @param {Object} opts.adapters - Map of adapter names to adapter classes.
   * @param {Object} opts.settings - Model settings configuration.
   */
  constructor(opts = {}) {
    super(opts);
  }

  get adapter_name() { return this.platform_key; }
  get models() { return this.adapter.models; }
  /**
   * Complete a chat request using the active adapter.
   * @param {Object} req - Request parameters.
   * @returns {Promise<Object>} Completion result.
   */
  async complete(req) {
    return await this.invoke_adapter_method('complete', req);
  }

  /**
   * Stream chat responses using the active adapter.
   * @param {Object} req - Request parameters.
   * @param {Object} handlers - Handlers for streaming events.
   * @returns {Promise<Object>} Streaming result.
   */
  async stream(req, handlers = {}) {
    return await this.invoke_adapter_method('stream', req, handlers);
  }

  /**
   * Stop an ongoing chat stream.
   */
  stop_stream() {
    this.invoke_adapter_method('stop_stream');
  }

  /**
   * Count tokens in the input using the active adapter.
   * @param {string} input - Text to tokenize.
   * @returns {Promise<Object>} Token count result.
   */
  async count_tokens(input) {
    return await this.invoke_adapter_method('count_tokens', input);
  }

  /**
   * Get available platforms as dropdown options.
   * @returns {Array<Object>} Array of platform options.
   */
  get_platforms_as_options() {
    console.log('get_platforms_as_options', this.adapters);
    return Object.entries(this.adapters).map(([key, AdapterClass]) => ({ value: key, name: AdapterClass.defaults.description || key }));
  }

  // /**
  //  * Get available models from the active adapter.
  //  * @param {boolean} [refresh=false] - Whether to refresh the model list.
  //  * @returns {Promise<Object>} Available models.
  //  */
  // async get_models(refresh = false) {
  //   return await this.invoke_adapter_method('get_models', refresh);
  // }


  /**
   * Re-render settings UI if the callback is provided.
   */
  re_render_settings() {
    if (this.opts.re_render_settings) {
      this.opts.re_render_settings();
    } else {
      // console.warn('No re-render settings function provided for SmartChatModel');
      this.render_settings();
    }
  }

  /**
   * Test the API key using the active adapter and re-render settings upon success.
   */
  async test_api_key() {
    if (this.adapter.test_api_key) {
      await this.adapter.test_api_key();
    }
    this.re_render_settings();
  }

  /**
   * Get the HTTP adapter, initializing it if necessary.
   * @returns {SmartHttpRequest} The HTTP adapter instance.
   */

  /**
   * Get the current platform configuration.
   * @returns {Object} Current platform configuration.
   */
  get platform() {
    const AdapterClass = this.adapters[this.platform_key];
    if (!AdapterClass) {
      throw new Error(`Platform "${this.platform_key}" not supported`);
    }
    return AdapterClass.defaults;
  }

  /**
   * Get the current platform key, defaulting to 'openai' if unsupported.
   * @returns {string} Current platform key.
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

  get default_model_key() {
    return this.adapter.constructor.defaults.default_model;
  }

  /**
   * Get the current settings.
   * @returns {Object} Current settings.
   */
  get settings() {
    return this.opts.settings;
  }

  reload_model() {
    console.log('reload_model', this.opts);
    if(this.opts.reload_model) this.opts.reload_model();
  }
  /**
   * Get the settings configuration schema.
   * @returns {Object} Processed settings configuration.
   */
  get settings_config() {
    const _settings_config = {
      platform_key: {
        name: 'Chat Model Platform',
        type: "dropdown",
        description: "Select a chat model platform to use with Smart Chat.",
        options_callback: 'get_platforms_as_options',
        is_scope: true, // trigger re-render of settings when changed
        // callback: 're_render_settings',
        callback: 'reload_model',
      },
      // Merge adapter-specific settings
      ...(this.adapter.settings_config || {}),
    };

    return this.process_settings_config(_settings_config);
  }

  /**
   * Process individual setting keys by replacing placeholders with the current platform key.
   * @param {string} key - The setting key to process.
   * @returns {string} Processed setting key.
   */
  process_setting_key(key) {
    return key.replace(/\[CHAT_ADAPTER\]/g, this.adapter_name);
  }
  /**
   * Gets the settings component renderer function.
   * Uses custom component if provided in opts, otherwise uses default.
   * @returns {Function} The settings component renderer function
   */
  get render_settings_component() {
    return (typeof this.opts.components?.settings === 'function'
      ? this.opts.components.settings
      : render_settings_component
    ).bind(this.smart_view);
  }
  /**
   * Gets the smart view instance from the environment.
   * Lazily initializes if not already created.
   * @returns {SmartView} The smart view instance
   */
  get smart_view() {
    if(!this._smart_view) this._smart_view = this.opts.env.init_module('smart_view'); // Decided: how to better handle this? Should still avoid direct dependency so can re-use platform-level adapters
    return this._smart_view;
  }
  /**
   * Renders the settings for the collection.
   * @param {HTMLElement} container - The container element to render the settings into.
   * @param {Object} opts - Additional options for rendering.
   * @param {Object} opts.settings_keys - An array of keys to render.
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
