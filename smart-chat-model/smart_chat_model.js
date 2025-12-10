import { SmartModel } from "smart-model";
import { normalize_error } from 'smart-utils/normalize_error.js';

/**
 * SmartChatModel - A versatile class for handling chat operations using various platform adapters.
 * @extends SmartModel
 * 
 * @deprecated Use SmartModels collection instead.
 * @example
 * ```javascript
 * const chatModel = new SmartChatModel({
 *   adapter: 'openai',
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
  scope_name = 'smart_chat_model';
  static defaults = {
    adapter: 'openai',
  };
  /**
   * Create a SmartChatModel instance.
   * @param {Object} opts - Configuration options
   * @param {string} opts.adapter - Adapter to use
   * @param {Object} opts.adapters - Map of adapter names to adapter classes
   * @param {Object} opts.settings - Model settings configuration
   */
  constructor(opts = {}) {
    super(opts);
  }

  /**
   * Get available models.
   * @returns {Object} Map of model objects
   */
  get models() { return this.adapter.models; }
  
  get can_stream() { return this.adapter.constructor.defaults.streaming; }

  /**
   * Complete a chat request.
   * @param {Object} req - Request parameters
   * @returns {Promise<Object>} Completion result
   */
  async complete(req, ) {
    const resp = await this.invoke_adapter_method('complete', req);
    if (resp.error) {
      throw normalize_error(resp.error);
    }
    return resp;
  }

  /**
   * Stream chat responses.
   * @param {Object} req - Request parameters
   * @param {Object} handlers - Event handlers for streaming
   * @param {Function} handlers.chunk - Handler for chunks: receives response object
   * @param {Function} handlers.error - Handler for errors: receives error object
   * @param {Function} handlers.done - Handler for completion: receives final response object
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
   * Test if API key is valid.
   * @returns {Promise<boolean>} True if API key is valid
   */
  async test_api_key() {
    await this.invoke_adapter_method('test_api_key');
    this.re_render_settings();
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
   * Get settings configuration.
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    const _settings_config = {
      adapter: {
        name: 'Chat Model Platform',
        type: "dropdown",
        description: "Select a platform/provider for chat models.",
        options_callback: 'get_platforms_as_options',
        is_scope: true, // trigger re-render of settings when changed
        callback: 'adapter_changed',
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

}
