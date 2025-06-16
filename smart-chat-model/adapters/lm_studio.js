import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

/**
 * Adapter for LM Studio's OpenAI-compatible API.
 * LM Studio provides OpenAI-like endpoints at /v1/*, allowing reuse of OpenAI clients.
 * @class SmartChatModelLmStudioAdapter
 * @extends SmartChatModelApiAdapter
 *
 * @property {Object} static defaults
 * @property {string} defaults.description - Human-readable description
 * @property {string} defaults.type - Adapter type ("API")
 * @property {string} defaults.endpoint - LM Studio's OpenAI-compatible chat completions endpoint
 * @property {boolean} defaults.streaming - Whether streaming is supported
 * @property {string} defaults.adapter - Adapter identifier
 * @property {string} defaults.models_endpoint - Endpoint for retrieving models
 * @property {string} defaults.default_model - Default model to use
 * @property {string} defaults.signup_url - URL with info
 */
export class SmartChatModelLmStudioAdapter extends SmartChatModelApiAdapter {
  static key = "lm_studio";
  static defaults = {
    description: "LM Studio (OpenAI-compatible)",
    type: "API",
    endpoint: "http://localhost:1234/v1/chat/completions",
    streaming: true,
    adapter: "LM_Studio_OpenAI_Compat",
    models_endpoint: "http://localhost:1234/v1/models",
    default_model: "", // Replace with a model listed by LM Studio
    signup_url: "https://lmstudio.ai/docs/api/openai-api",
    can_use_tools: true,
  };

  /**
   * Request adapter class
   */
  get req_adapter() { return SmartChatModelLmStudioRequestAdapter; }

  /**
   * Response adapter class
   */
  get res_adapter() { return SmartChatModelLmStudioResponseAdapter; }

  /**
   * Validate parameters for getting models
   * @returns {boolean} True
   */
  validate_get_models_params() {
    return true;
  }

  /**
   * LM Studio's /v1/models returns OpenAI-like response format:
   * {
   *   "object": "list",
   *   "data": [
   *     { "id": "model-name", "object": "model", ... },
   *     ...
   *   ]
   * }
   * Parse this like the OpenAI format.
   * @param {Object} model_data - Raw model data from LM Studio
   * @returns {Object} Map of model objects
   */
  parse_model_data(model_data) {
    if (model_data.object !== 'list' || !Array.isArray(model_data.data)) {
      return { "_": { id: "No models found." } };
    }
    const parsed = {};
    for (const m of model_data.data) {
      parsed[m.id] = {
        id: m.id,
        model_name: m.id,
        // We don't have direct context length info here, can set a default
        // or check if LM Studio returns it in the model object
        description: `LM Studio model: ${m.id}`,
        multimodal: false, // LM Studio doesn't mention multimodal support via /v1
      };
    }
    return parsed;
  }

  get models_endpoint_method(){
    return 'get';
  }

  /**
   * Count tokens in input text (no dedicated endpoint)
   * Rough estimate: 1 token ~ 4 chars
   * @param {string|Object} input
   * @returns {Promise<number>}
   */
  async count_tokens(input) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    return Math.ceil(text.length / 4);
  }

  /**
   * Test API key - LM Studio doesn't require API key. Always true.
   * @returns {Promise<boolean>}
   */
  async test_api_key() {
    return true;
  }


  /**
   * Validate configuration
   */
  validate_config() {
    if (!this.adapter_config.model_key) {
      return { valid: false, message: "No model selected." };
    }
    return { valid: true, message: "Configuration is valid." };
  }
}

/**
 * Request adapter for LM Studio OpenAI-compatible API
 * Allows forcing tool use by adding a system prompt if tool_choice is set.
 * @class SmartChatModelLmStudioRequestAdapter
 * @extends SmartChatModelRequestAdapter
 */
export class SmartChatModelLmStudioRequestAdapter extends SmartChatModelRequestAdapter {
  to_platform(streaming = false) { 
    const req = this.to_openai(streaming);
    const body = JSON.parse(req.body);

    // If a tool_choice is specified, add a system message to force tool use
    if (this.tool_choice?.function?.name) {
      if(typeof body.messages[body.messages.length - 1].content === 'string'){
        body.messages[body.messages.length - 1].content = [
          {
            type: 'text',
            text: body.messages[body.messages.length - 1].content
          },
        ]
      }
      body.messages[body.messages.length - 1].content.push({
        type: 'text',
        text: `Use the "${this.tool_choice.function.name}" tool.`
      });
      // Set tool_choice to a supported string value
      body.tool_choice = "required";
    } else if (body.tool_choice && typeof body.tool_choice === "object") {
      // Fallback: if tool_choice is an object, set to "auto"
      body.tool_choice = "auto";
    }

    req.body = JSON.stringify(body);
    return req;
  }
}

/**
 * Response adapter for LM Studio OpenAI-compatible API
 * LM Studio returns OpenAI-like responses directly.
 * @class SmartChatModelLmStudioResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
export class SmartChatModelLmStudioResponseAdapter extends SmartChatModelResponseAdapter {
}