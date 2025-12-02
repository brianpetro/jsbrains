import { SmartModelAdapter } from "smart-model/adapters/_adapter.js";

/**
 * Base adapter class for SmartChatModel implementations.
 * Provides core functionality for chat model adapters.
 * @abstract
 * @class SmartChatModelAdapter
 * @extends SmartModelAdapter
 */
export class SmartChatModelAdapter extends SmartModelAdapter {
  /**
   * @override in sub-class with adapter-specific default configurations
   * @property {string} id - The adapter identifier
   * @property {string} description - Human-readable description
   * @property {string} type - Adapter type ("API")
   * @property {string} endpoint - API endpoint
   * @property {boolean} streaming - Whether streaming is supported
   * @property {string} adapter - Adapter identifier
   * @property {string} models_endpoint - Endpoint for retrieving models
   * @property {string} default_model - Default model to use
   * @property {string} signup_url - URL for API key signup
   */
  static defaults = {};
  /**
   * Create a SmartChatModelAdapter instance.
   * @param {SmartChatModel} model - The parent SmartChatModel instance
   */
  constructor(model) {
    super(model);
    /**
     * @deprecated use this.model instead
     */
    this.smart_chat = model;
    /**
     * @deprecated use this.model instead
     */
    this.main = model;
  }

  /**
   * Complete a chat request.
   * @abstract
   * @param {Object} req - Request parameters
   * @returns {Promise<Object>} Completion result
   */
  async complete(req) {
    throw new Error("complete not implemented");
  }

  /**
   * Count tokens in input text.
   * @abstract
   * @param {string|Object} input - Text to count tokens for
   * @returns {Promise<number>} Token count
   */
  async count_tokens(input) {
    throw new Error("count_tokens not implemented");
  }

  /**
   * Stream chat responses.
   * @abstract
   * @param {Object} req - Request parameters
   * @param {Object} handlers - Event handlers for streaming
   * @returns {Promise<string>} Complete response text
   */
  async stream(req, handlers = {}) {
    throw new Error("stream not implemented");
  }

  /**
   * Test if API key is valid.
   * @abstract
   * @returns {Promise<boolean>} True if API key is valid
   */
  async test_api_key() {
    throw new Error("test_api_key not implemented");
  }

  /**
   * Refresh available models.
   */
  refresh_models() {
    console.log('refresh_models');
    this.get_models(true);
  }

  /**
   * Get settings configuration.
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    return {
      "[CHAT_ADAPTER].model_key": {
        name: 'Chat Model',
        type: "dropdown",
        description: "Select a chat model.",
        options_callback: 'adapter.get_models_as_options',
        callback: 'reload_model',
        default: this.constructor.defaults.default_model,
      },
      "[CHAT_ADAPTER].refresh_models": {
        name: 'Refresh Models',
        type: "button",
        description: "Refresh the list of available models.",
        callback: 'adapter.refresh_models',
      },
    };
  }


}
