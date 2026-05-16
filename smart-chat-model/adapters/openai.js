import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from "./_api.js";

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

  get req_adapter() {
    return SmartChatModelOpenaiRequestAdapter;
  }
  
  /**
   * Parse model data from OpenAI API response.
   * Filters for GPT models. Token limits are enriched from models.dev data.
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
          raw: model,
        };
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
   * @deprecated in favor of smart_model.test_model (should be safe to remove 2026-02-10)
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

export class SmartChatModelOpenaiRequestAdapter extends SmartChatModelRequestAdapter {
  to_openai(streaming = false) {
    const req = super.to_openai(streaming);
    const body = JSON.parse(req.body);

    // const number_params = this.model_id?.startsWith('o1-')
    //   ? ['top_p', 'presence_penalty', 'frequency_penalty']
    //   : ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty']
    // ;
    // for (const key of number_params) {
    //   const value = this.get_request_value(key);
    //   if (value === undefined) continue;
    //   const number = Number(value);
    //   if (Number.isFinite(number)) body[key] = number;
    // }

    for (const key of ['reasoning_effort', 'verbosity']) {
      const value = this.get_request_value(key);
      if (value) body[key] = value;
    }

    const max_completion_tokens = this.get_request_value('max_completion_tokens') || this.get_request_value('max_tokens');
    if (max_completion_tokens) {
      const number = Number(max_completion_tokens);
      if (Number.isFinite(number) && number > 0) body.max_completion_tokens = Math.floor(number);
    }

    if(streaming) {
      body.stream_options = {include_usage: true};
    }

    req.body = JSON.stringify(body);
    return req;
  }

  get_request_value(key) {
    if (this._req[key] !== undefined && this._req[key] !== null && this._req[key] !== '') return this._req[key];
    const settings_value = this.adapter.model.data?.[key];
    if (settings_value !== undefined && settings_value !== null && settings_value !== '') return settings_value;
  }
}


/**
 * Response adapter for OpenAI API
 * @class SmartChatModelOpenaiResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
class SmartChatModelOpenaiResponseAdapter extends SmartChatModelResponseAdapter {
  handle_chunk(chunk) {
    if(chunk === 'data: [DONE]') return;
    const parsed = JSON.parse(chunk.split('data: ')[1] || '{}');
    if(parsed.usage) this._res.usage = parsed.usage;
    if(!parsed.choices?.length) return;
    return super.handle_chunk(chunk);
  }
}

