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
    endpoint: 'https://api.deepseek.ai/v1/chat/completions',
    streaming: true,
    adapter: 'DeepSeek',
    models_endpoint: 'https://api.deepseek.ai/v1/models',
    default_model: 'deepseek-base',
    signup_url: 'https://deepseek.ai/signup',
    can_use_tools: true
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

  /**
   * Validate DeepSeek adapter configuration
   * @returns {Object} { valid: boolean, message: string }
   */
  validate_config() {
    if(!this.api_key) {
      return { valid: false, message: 'DeepSeek API key is missing.' };
    }
    if(!this.adapter_config.model_key) {
      return { valid: false, message: 'No model selected for DeepSeek.' };
    }
    return { valid: true, message: 'Configuration is valid.' };
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
  /**
   * Handle streaming chunk in raw form
   * @param {string} chunk - SSE data chunk
   */
  handle_chunk(chunk) {
    if(!chunk.trim()) return;
    // Typically chunk starts with 'data: '
    let raw = chunk.trim();
    if(raw.startsWith('data: ')) {
      raw = raw.slice(6);
    }
    if(raw === '[DONE]') return; // typical finish indicator

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch(err) {
      console.warn('DeepSeek invalid JSON chunk:', raw);
      return;
    }
    // Initialize base structure if missing
    if(!this._res.choices?.[0]) {
      this._res.choices = [ { index: 0, message: { role: 'assistant', content: '' } } ];
    }
    // Fill in response ID / model if present
    if(parsed.id && !this._res.id) this._res.id = parsed.id;
    if(parsed.model && !this._res.model) this._res.model = parsed.model;

    // If partial content is in "choices[0].delta.content" style, accumulate
    if(parsed.choices && Array.isArray(parsed.choices)) {
      const delta = parsed.choices[0]?.delta;
      if(delta?.content) {
        this._res.choices[0].message.content += delta.content;
      }
      if(parsed.usage && !this._res.usage) {
        this._res.usage = parsed.usage;
      }
    }
  }
}
