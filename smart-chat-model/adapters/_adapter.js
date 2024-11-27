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
   * Get the models.
   * @returns {Object} Map of model objects
   */
  get models() {
    if(
      typeof this.adapter_config.models === 'object'
      && Object.keys(this.adapter_config.models || {}).length > 0
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
   * Count tokens in input text.
   * @abstract
   * @param {string|Object} input - Text to count tokens for
   * @returns {Promise<number>} Token count
   */
  async count_tokens(input) {
    throw new Error("count_tokens not implemented");
  }

  /**
   * Get available models from the API.
   * @abstract
   * @param {boolean} [refresh=false] - Whether to refresh cached models
   * @returns {Promise<Object>} Map of model objects
   */
  async get_models(refresh = false) {
    throw new Error("get_models not implemented");
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

  /**
   * Validate the adapter configuration.
   * @abstract
   * @returns {Object} { valid: boolean, message: string }
   */
  validate_config() {
    throw new Error("validate_config not implemented");
  }

  get can_use_tools() {
    return this.model_config?.can_use_tools || false;
  }
}
