import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

/**
 * Adapter for DeepSeek's Chat API.
 * Converts OpenAI-style requests to DeepSeek format, then converts response back to OpenAI format.
 * @class SmartChatModelDeepseekAdapter
 * @extends SmartChatModelApiAdapter
 */
export class SmartChatModelDeepseekAdapter extends SmartChatModelApiAdapter {
  static key = 'deepseek';

  static defaults = {
    description: 'DeepSeek',
    type: 'API',
    endpoint: 'https://api.deepseek.com/chat/completions',
    streaming: true,
    adapter: 'DeepSeek',
    models_endpoint: 'https://api.deepseek.com/models',
    default_model: 'deepseek-base',
    signup_url: 'https://deepseek.com/signup',
  };

  /**
   * Get the request adapter class
   * @returns {typeof SmartChatModelDeepseekRequestAdapter} Request adapter class
   */
  get req_adapter() {
    return SmartChatModelDeepseekRequestAdapter;
  }

  /**
   * Get the response adapter class
   * @returns {typeof SmartChatModelDeepseekResponseAdapter} Response adapter class
   */
  get res_adapter() {
    return SmartChatModelDeepseekResponseAdapter;
  }

  get models_endpoint_method() { return 'GET'; }
  /**
   * Parse the raw model data from DeepSeek's /v1/models endpoint
   * into a structured map of model objects keyed by model ID.
   * @param {Object} model_data - Raw JSON from DeepSeek
   * @returns {Object} Map of model objects
   */
  parse_model_data(model_data) {
    if(!model_data?.data || !Array.isArray(model_data.data)){
      return { '_': { id: 'No models found.' } };
    }
    const parsed = {};
    for(const m of model_data.data){
      parsed[m.id] = {
        model_name: m.id,
        id: m.id,
        max_input_tokens: m.context_size || 8192,
        description: m.description || m.name || m.id,
        raw: m
      };
    }
    return parsed;
  }

  /**
   * Estimate tokens in user input.
   * @param {string|Object} input - Input text or structured message
   * @returns {Promise<number>} Token count estimate
   */
  async count_tokens(input) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    // Simple estimate: 1 token ~ 4 chars
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if an incoming streaming chunk signals end of stream.
   * @param {CustomEvent} event - SSE event with data
   * @returns {boolean} True if end of stream
   */
  is_end_of_stream(event) {
    if(!event?.data) return false;
    // If chunk indicates final, or the default pattern "data: [DONE]"
    return event.data.includes('"done":true') || event.data.includes('[DONE]');
  }

}

/**
 * Request adapter for DeepSeek
 * In many cases, you can reuse your existing OpenAI logic
 * or adapt if the service has special fields.
 * @class SmartChatModelDeepseekRequestAdapter
 * @extends SmartChatModelRequestAdapter
 */
export class SmartChatModelDeepseekRequestAdapter extends SmartChatModelRequestAdapter {
  /**
   * Convert incoming request to DeepSeek's expected format
   * Often just reuse the base "to_openai()" if that matches DeepSeek's design
   * @param {boolean} streaming - True if streaming
   * @returns {Object} Request parameters
   */
  to_platform(streaming = false) {
    return this.to_openai(streaming);
  }
}

/**
 * Response adapter for DeepSeek
 * Adjust the chunk parser if needed for partial responses.
 * @class SmartChatModelDeepseekResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
export class SmartChatModelDeepseekResponseAdapter extends SmartChatModelResponseAdapter {
}
