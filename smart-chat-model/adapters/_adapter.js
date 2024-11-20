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
   * Get the models.
   * @returns {Array} An array of model objects.
   */
  get models() {
    if(
      typeof this.adapter_config.models === 'object'
      && Object.keys(this.adapter_config.models).length > 0
    ) return this.adapter_config.models;
    else {
      return {};
    }
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
   * Validate the parameters for get_models.
   * @returns {boolean|Array<Object>} True if parameters are valid, otherwise an array of error objects
   */
  validate_get_models_params(){
    return true;
  }

  /**
   * Get available models as dropdown options synchronously.
   * @returns {Array<Object>} Array of model options.
   */
  get_models_as_options_sync() {
    const models = this.models;
    const params_valid = this.validate_get_models_params();
    if(params_valid !== true) return params_valid;
    if(!Object.keys(models || {}).length){
      this.get_models(true); // refresh models
      return [{value: '', name: 'No models currently available'}];
    }
    return Object.values(models).map(model => ({ value: model.id, name: model.name || model.id })).sort((a, b) => a.name.localeCompare(b.name));
  }

  refresh_models() {
    console.log('refresh_models');
    this.get_models(true);
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
