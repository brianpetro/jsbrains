import { SmartChatModelApiAdapter, SmartChatModelResponseAdapter } from "./_api.js";

const EXCLUDED_PREFIXES = [
  'text-', 
  'davinci',
  'babbage',
  'ada',
  'curie',
  'dall-e',
  'whisper',
  'omni',
  'tts',
  'gpt-4o-mini-tts',
  'computer-use',
  'codex',
  'gpt-4o-transcribe',
  'gpt-4o-mini-transcribe',
  'gpt-4o-mini-realtime',
  'gpt-4o-realtime',
  'o4-mini-deep-research',
  'o3-deep-research',
  'gpt-image'
];
/**
 * Adapter for OpenAI's chat API.
 * Handles token counting and API communication for OpenAI chat models.
 * @class SmartChatModelOpenaiAdapter
 * @extends SmartChatModelApiAdapter
 * 
 * @property {Object} static defaults - Default configuration for OpenAI adapter
 * @property {string} defaults.description - Human-readable description
 * @property {string} defaults.type - Adapter type ("API")
 * @property {string} defaults.endpoint - OpenAI API endpoint
 * @property {boolean} defaults.streaming - Whether streaming is supported
 * @property {string} defaults.models_endpoint - Endpoint for retrieving models
 * @property {string} defaults.default_model - Default model to use
 * @property {string} defaults.signup_url - URL for API key signup
 */
export class SmartChatModelOpenaiAdapter extends SmartChatModelApiAdapter {
  static key = "openai";
  static defaults = {
    description: "OpenAI",
    type: "API",
    endpoint: "https://api.openai.com/v1/chat/completions",
    streaming: true,
    models_endpoint: "https://api.openai.com/v1/models",
    default_model: "gpt-5-nano",
    signup_url: "https://platform.openai.com/api-keys",
  };

  res_adapter = SmartChatModelOpenaiResponseAdapter;
  
  /**
   * Parse model data from OpenAI API response.
   * Filters for GPT models and adds context window information.
   * @param {Object} model_data - Raw model data from OpenAI
   * @returns {Object} Map of model objects with capabilities and limits
   */
  parse_model_data(model_data) {
    return model_data.data
      .filter(model => !EXCLUDED_PREFIXES.some(m => model.id.startsWith(m)) && !model.id.includes('-instruct'))
      .reduce((acc, model) => {
        const out = {
          model_name: model.id,
          id: model.id,
          multimodal: true,
          max_input_tokens: get_max_input_tokens(model.id),
        };
        // const m = Object.entries(model_context).find(m => m[0] === model.id || model.id.startsWith(m[0] + '-'));
        // if (m) {
        //   out.max_input_tokens = m[1].context;
        //   out.description = `context: ${m[1].context}, output: ${m[1].max_out}`;
        // }
        acc[model.id] = out;
        return acc;
      }, {})
    ;
  }

  /**
   * Override the HTTP method for fetching models.
   */
  models_endpoint_method = 'GET';

  /**
   * Test the API key by attempting to fetch models.
   * @returns {Promise<boolean>} True if API key is valid
   */
  async test_api_key() {
    const models = await this.get_models();
    return models.length > 0;
  }

  /**
   * Get settings configuration for OpenAI adapter.
   * Adds image resolution setting for multimodal models.
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    const config = super.settings_config;
    config['[CHAT_ADAPTER].open_ai_note'] = {
      name: 'Note about using OpenAI',
      type: "html",
      value: "<b>OpenAI models:</b> Some models require extra verification steps in your OpenAI account for them to appear in the model list.",
    }
    return config;
  }
}


function get_max_input_tokens(model_id){
  if(model_id.startsWith('gpt-4.1')){
    return 1_000_000;
  }
  if(model_id.startsWith('o')){
    return 200_000;
  }
  if(model_id.startsWith('gpt-5')){
    return 400_000;
  }
  if(model_id.startsWith('gpt-4o') || model_id.startsWith('gpt-4.5') || model_id.startsWith('gpt-4-turbo')){
    return 128_000;
  }
  if(model_id.startsWith('gpt-4')){
    return 8192;
  }
  if(model_id.startsWith('gpt-3')){
    return 16385;
  }
  return 8000;
}

/**
 * Response adapter for OpenAI API
 * @class SmartChatModelOpenaiResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
class SmartChatModelOpenaiResponseAdapter extends SmartChatModelResponseAdapter {
}


// // Manual model context for now since OpenAI doesn't provide this info in the API response
// // may require updating when new models are released
// const model_context = {
//   "gpt-3.5-turbo-0125": {
//     "context": 16385,
//     "max_out": 4096
//   },
//   "gpt-3.5-turbo-0301": {
//     "context": 4097,
//     "max_out": 4097
//   },
//   "gpt-3.5-turbo-0613": {
//     "context": 4097,
//     "max_out": 4097
//   },
//   "gpt-3.5-turbo-1106": {
//     "context": 16385,
//     "max_out": 4096
//   },
//   "gpt-3.5-turbo-16k": {
//     "context": 16385,
//     "max_out": 16385
//   },
//   "gpt-3.5-turbo-16k-0613": {
//     "context": 16385,
//     "max_out": 16385
//   },
//   "gpt-4-0125-preview": {
//     "context": 128000,
//     "max_out": 4096
//   },
//   "gpt-4-0314": {
//     "context": 8192,
//     "max_out": 8192
//   },
//   "gpt-4-0613": {
//     "context": 8192,
//     "max_out": 8192
//   },
//   "gpt-4-1106-preview": {
//     "context": 128000,
//     "max_out": 4096
//   },
//   "gpt-4-1106-vision-preview": {
//     "context": 128000,
//     "max_out": 4096
//   },
//   "gpt-4-32k-0314": {
//     "context": 32768,
//     "max_out": 32768
//   },
//   "gpt-4-32k-0613": {
//     "context": 32768,
//     "max_out": 32768
//   },
//   "gpt-4-turbo-2024-04-09": {
//     "context": 128000,
//     "max_out": 4096
//   },
//   "gpt-4-turbo-preview": {
//     "context": 128000,
//     "max_out": 4096
//   },
//   "gpt-4-vision-preview": {
//     "context": 128000,
//     "max_out": 4096
//   },
//   "gpt-3.5-turbo": {
//     "context": 16385,
//     "max_out": 4096
//   },
//   "gpt-4-turbo": {
//     "context": 128000,
//     "max_out": 4096
//   },
//   "gpt-4-32k": {
//     "context": 32768,
//     "max_out": 32768
//   },
//   "gpt-4o": {
//     "context": 128000,
//     "max_out": 4096
//   },
//   "gpt-4": {
//     "context": 8192,
//     "max_out": 8192
//   }
// };