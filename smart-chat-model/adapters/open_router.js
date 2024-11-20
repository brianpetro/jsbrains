import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

/**
 * Adapter for OpenRouter's API.
 * Provides access to multiple model providers through a unified API.
 * @class SmartChatModelOpenRouterAdapter
 * @extends SmartChatModelApiAdapter
 * 
 */
export class SmartChatModelOpenRouterAdapter extends SmartChatModelApiAdapter {
  static defaults = {
    description: "Open Router",
    type: "API",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    streaming: true,
    adapter: "OpenRouter",
    models_endpoint: "https://openrouter.ai/api/v1/models",
    default_model: "mistralai/mistral-7b-instruct:free",
    signup_url: "https://accounts.openrouter.ai/sign-up?redirect_url=https%3A%2F%2Fopenrouter.ai%2Fkeys",
    can_use_tools: true,
  };

  /**
   * Get request adapter class
   * @returns {typeof SmartChatModelOpenRouterRequestAdapter} Request adapter class
   */
  get req_adapter() { return SmartChatModelOpenRouterRequestAdapter; }

  /**
   * Get response adapter class
   * @returns {typeof SmartChatModelOpenRouterResponseAdapter} Response adapter class
   */
  get res_adapter() { return SmartChatModelOpenRouterResponseAdapter; }

  /**
   * Get API key from various sources
   * @returns {string|undefined} API key if available
   */
  get api_key(){
    return this.main.opts.api_key // opts added at init take precedence
      || this.adapter_settings?.api_key // then adapter settings
      || process.env.DEFAULT_OPEN_ROUTER_API_KEY
    ;
  }

  /**
   * Count tokens in input text (rough estimate)
   * @param {string|Object} input - Text to count tokens for
   * @returns {Promise<number>} Estimated token count
   */
  async count_tokens(input) {
    // OpenRouter doesn't provide a token counting endpoint, so we'll use a rough estimate
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    return Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 characters
  }

  get models_request_params() {
    return {
      url: this.models_endpoint,
      method: 'GET',
    };
  }
  
  /**
   * Parse model data from OpenRouter API response
   * @param {Object} model_data - Raw model data
   * @returns {Object} Map of model objects with capabilities and limits
   */
  parse_model_data(model_data) {
    if(model_data.data) {
      model_data = model_data.data;
    }
    if(model_data.error) throw new Error(model_data.error);
    console.log('model_data', model_data);
    return model_data.reduce((acc, model) => {
      acc[model.id] = {
        model_name: model.id,
        id: model.id,
        max_input_tokens: model.context_length,
        description: model.name,
        actions: model.description.includes('tool use') || model.description.includes('function call'),
        multimodal: model.architecture.modality === 'multimodal',
        raw: model
      };
      return acc;
    }, {});
  }
}

/**
 * Request adapter for OpenRouter API
 * @class SmartChatModelOpenRouterRequestAdapter
 * @extends SmartChatModelRequestAdapter
 */
export class SmartChatModelOpenRouterRequestAdapter extends SmartChatModelRequestAdapter {
  to_platform() { return this.to_openai(); }
}

/**
 * Response adapter for OpenRouter API
 * @class SmartChatModelOpenRouterResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
export class SmartChatModelOpenRouterResponseAdapter extends SmartChatModelResponseAdapter {
  to_platform() { return this.to_openai(); }
  get object() { return 'chat.completion'; }
}