import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

/**
 * Adapter for Groq API.
 * This adapter assumes the Groq endpoint provides a format similar to OpenAI.
 * The main difference from openai.js: When processing assistant messages with array or null content, we merge into a single string.
 */
export class SmartChatModelGroqAdapter extends SmartChatModelApiAdapter {
  static key = "groq";
  static defaults = {
    description: "Groq",
    type: "API",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    streaming: true,
    adapter: "Groq",
    models_endpoint: "https://api.groq.com/openai/v1/models",
    default_model: "llama3-8b-8192",
    signup_url: "https://groq.com",
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

  get models_endpoint_method () { return 'GET'; }

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
