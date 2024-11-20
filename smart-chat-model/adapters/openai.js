import { SmartChatModelApiAdapter } from "./_api.js";

/**
 * Adapter for OpenAI's chat API.
 * Handles token counting and API communication for OpenAI chat models.
 * @class SmartChatModelOpenaiAdapter
 * @extends SmartChatModelApiAdapter
 */
export class SmartChatModelOpenaiAdapter extends SmartChatModelApiAdapter {
  static defaults = {
    description: "OpenAI",
    type: "API",
    endpoint: "https://api.openai.com/v1/chat/completions",
    streaming: true,
    actions: true,
    models_endpoint: "https://api.openai.com/v1/models",
    default_model: "gpt-4o-mini",
    signup_url: "https://platform.openai.com/api-keys"
  };
  
  /**
   * Parse model data from OpenAI API response.
   * @param {Object} model_data - Raw model data from OpenAI
   * @returns {Array<Object>} Parsed models
   */
  parse_model_data(model_data) {
    return model_data.data
      .filter(model => model.id.startsWith('gpt-') && !model.id.includes('-instruct'))
      .reduce((acc, model) => {
        const out = {
          model_name: model.id,
          id: model.id,
          multimodal: model.id.includes('vision') || model.id.includes('gpt-4-turbo') || model.id.startsWith('gpt-4o')
        };
        const m = Object.entries(model_context).find(m => m[0] === model.id || model.id.startsWith(m[0] + '-'));
        if (m) {
          out.max_input_tokens = m[1].context;
          out.description = `context: ${m[1].context}, output: ${m[1].max_out}`;
        }
        acc[model.id] = out;
        return acc;
      }, {})
    ;
  }

  /**
   * Override the HTTP method for fetching models.
   * @returns {string} HTTP method
   */
  get models_endpoint_method() { return 'GET'; }

  /**
   * Test the API key by fetching models.
   * @async
   * @returns {Promise<boolean>} True if API key is valid
   */
  async test_api_key() {
    const models = await this.get_models();
    return models.length > 0;
  }

  /**
   * Get the settings configuration for OpenAI adapter.
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    return {
      ...super.settings_config,
      "[CHAT_ADAPTER].image_resolution": {
        name: 'Image Resolution',
        type: "dropdown",
        description: "Select the image resolution for the chat model.",
        option_1: 'low',
        option_2: 'high',
        default: 'low',
        conditional: (_this) => _this.adapter?.model_config?.multimodal,
      },
    };
  }
}

// Manual model context for now since OpenAI doesn't provide this info in the API response
// may require updating when new models are released
const model_context = {
  "gpt-3.5-turbo-0125": {
    "context": 16385,
    "max_out": 4096
  },
  "gpt-3.5-turbo-0301": {
    "context": 4097,
    "max_out": 4097
  },
  "gpt-3.5-turbo-0613": {
    "context": 4097,
    "max_out": 4097
  },
  "gpt-3.5-turbo-1106": {
    "context": 16385,
    "max_out": 4096
  },
  "gpt-3.5-turbo-16k": {
    "context": 16385,
    "max_out": 16385
  },
  "gpt-3.5-turbo-16k-0613": {
    "context": 16385,
    "max_out": 16385
  },
  "gpt-4-0125-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-0314": {
    "context": 8192,
    "max_out": 8192
  },
  "gpt-4-0613": {
    "context": 8192,
    "max_out": 8192
  },
  "gpt-4-1106-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-1106-vision-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-32k-0314": {
    "context": 32768,
    "max_out": 32768
  },
  "gpt-4-32k-0613": {
    "context": 32768,
    "max_out": 32768
  },
  "gpt-4-turbo-2024-04-09": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-turbo-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-vision-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-3.5-turbo": {
    "context": 16385,
    "max_out": 4096
  },
  "gpt-4-turbo": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-32k": {
    "context": 32768,
    "max_out": 32768
  },
  "gpt-4o": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4": {
    "context": 8192,
    "max_out": 8192
  }
};