import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

/**
 * Adapter for Groq API.
 * This adapter assumes the Groq endpoint provides a format similar to OpenAI.
 * The main difference from openai.js: When processing assistant messages with array or null content, we merge into a single string.
 */
export class SmartChatModelGroqAdapter extends SmartChatModelApiAdapter {
  static defaults = {
    description: "Groq",
    type: "API",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    streaming: true,
    adapter: "Groq",
    models_endpoint: "https://api.groq.com/openai/v1/models",
    default_model: "llama3-8b-8192",
    signup_url: "https://groq.com",
    can_use_tools: true,
  };

  /**
   * Request adapter class
   * @returns {typeof SmartChatModelGroqRequestAdapter}
   */
  get req_adapter() { return SmartChatModelGroqRequestAdapter; }

  /**
   * Response adapter class
   * @returns {typeof SmartChatModelGroqResponseAdapter}
   */
  get res_adapter() { return SmartChatModelGroqResponseAdapter; }

  /**
   * Retrieve the list of models from Groq's API.
   * @returns {Promise<Object>} A dictionary of models keyed by their id
   */
  async get_models(refresh = false) {
    if (!refresh && this.adapter_config?.models && Object.keys(this.adapter_config.models).length > 0) {
      return this.adapter_config.models;
    }

    const request_params = {
      url: this.models_endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.api_key}`
      }
    };

    try {
      const resp = await this.http_adapter.request(request_params);
      const data = await resp.json();
      const model_data = this.parse_model_data(data);
      this.adapter_settings.models = model_data;
      this.model.re_render_settings();
      return model_data;
    } catch (error) {
      console.error('Failed to fetch Groq model data:', error);
      return {"_": {id: "Failed to fetch models from Groq"}};
    }
  }

  /**
   * Parse model data from Groq API format to a dictionary keyed by model ID.
   * The API returns a list of model objects like:
   * {
   *   "object": "list",
   *   "data": [ { "id": "...", "object": "model", ... }, ... ]
   * }
   * 
   * We'll convert each model to:
   * {
   *   model_name: model.id,
   *   id: model.id,
   *   max_input_tokens: model.context_window,
   *   description: `Owned by: ${model.owned_by}, context: ${model.context_window}`,
   *   multimodal: Check if model name or description suggests multimodality
   * }
   */
  parse_model_data(model_data) {
    if (model_data.object !== 'list' || !Array.isArray(model_data.data)) {
      return {"_": { id: "No models found." }};
    }

    const parsed = {};
    for (const m of model_data.data) {
      parsed[m.id] = {
        model_name: m.id,
        id: m.id,
        max_input_tokens: m.context_window || 8192,
        description: `Owned by: ${m.owned_by}, context: ${m.context_window}`,
        // A basic heuristic for multimodal: if 'vision' or 'tool' is in model id
        // Adjust as needed based on known capabilities
        multimodal: m.id.includes('vision'),
      };
    }
    return parsed;
  }

  /**
   * Validate configuration for Groq
   * @returns {Object} { valid: boolean, message: string }
   */
  validate_config() {
    if(!this.adapter_config.model_key) return { valid: false, message: "No model selected." };
    if (!this.api_key) {
      return { valid: false, message: "API key is missing." };
    }
    return { valid: true, message: "Configuration is valid." };
  }
}

/**
 * Request adapter for Groq API
 * @class SmartChatModelGroqRequestAdapter
 * @extends SmartChatModelRequestAdapter
 */
export class SmartChatModelGroqRequestAdapter extends SmartChatModelRequestAdapter {
  _get_openai_content(message) {
    if(['assistant', 'tool'].includes(message.role)){
      // merge messages with array or null content into a single string
      if(Array.isArray(message.content)) {
        return message.content.map(part => {
          if (typeof part === 'string') return part;
          if (part?.text) return part.text;
          return '';
        }).join('\n');
      }
    }
    return message.content;
  }
}

/**
 * Response adapter for Groq API
 * @class SmartChatModelGroqResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
export class SmartChatModelGroqResponseAdapter extends SmartChatModelResponseAdapter {
}
