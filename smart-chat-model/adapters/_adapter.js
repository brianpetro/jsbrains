import { SmartModelAdapter } from "smart-model/adapters/_adapter.js";

/**
 * Base adapter class for SmartChatModel implementations.
 * @abstract
 * @class SmartChatModelAdapter
 * @extends SmartModelAdapter
 */
export class SmartChatModelAdapter extends SmartModelAdapter {
  /**
   * @override in sub-class with adapter-specific default configurations
   * @param {string} id - The adapter identifier
   */
  static config = {};
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

  get models() {
    // throw new Error("models getter not implemented");
    return this.adapter_settings.models;
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
   * Count tokens in input.
   * @abstract
   * @param {string} input - Text to tokenize
   * @returns {Promise<Object>} Token count result
   */
  async count_tokens(input) {
    throw new Error("count_tokens not implemented");
  }

  /**
   * Get available models.
   * @abstract
   * @param {boolean} [refresh=false] - Whether to refresh the model list
   * @returns {Promise<Array<Object>>} Available models
   */
  async get_models(refresh = false) {
    throw new Error("get_models not implemented");
  }

  /**
   * Stream chat responses.
   * @abstract
   * @param {Object} req - Request parameters
   * @param {Object} handlers - Handlers for streaming events
   * @returns {Promise<Object>} Streaming result
   */
  async stream(req, handlers = {}) {
    throw new Error("stream not implemented");
  }

  /**
   * Test the API key.
   * @abstract
   * @returns {Promise<boolean>} True if API key is valid
   */
  async test_api_key() {
    throw new Error("test_api_key not implemented");
  }

  /**
   * Get available models as dropdown options synchronously.
   * @returns {Array<Object>} Array of model options.
   */
  get_models_as_options_sync() {
    const models = this.models;
    if(!Object.keys(models || {}).length){
      return [{value: '', name: 'No models currently available'}];
    }
    return Object.values(models).map(model => ({ value: model.id, name: model.name || model.id })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get the settings configuration.
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    return {
      "[CHAT_ADAPTER].model_key": {
        name: 'Chat Model',
        type: "dropdown",
        description: "Select a chat model to use with Smart Chat.",
        options_callback: 'adapter.get_models_as_options_sync',
        callback: 're_render_settings',
      },
    };
  }
}
