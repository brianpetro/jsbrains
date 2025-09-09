import {
  SmartEmbedModelApiAdapter,
  SmartEmbedModelRequestAdapter,
  SmartEmbedModelResponseAdapter,
} from "./_api.js";

/**
 * Normalize LM Studio model data into SmartEmbedModel format.
 * Pure and reusable.
 * @param {Object} list - Response from LM Studio `/v1/models` endpoint
 * @param {string} [adapter_key='lm_studio'] - Adapter identifier
 * @returns {Object} Parsed models map
 */
export function parse_lm_studio_models(list, adapter_key = 'lm_studio') {
  if (list.object !== "list" || !Array.isArray(list.data)) {
    return { _: { id: "No models found." } };
  }
  console.log("LM Studio models", list);
  return list.data
    .filter(m => m.id && m.type === "embeddings")
    .reduce((acc, m) => {
      acc[m.id] = {
        id: m.id,
        model_name: m.id,
        max_tokens: m.loaded_context_length || 512,
        description: `LM Studio model: ${m.id}`,
        adapter: adapter_key,
      };
      return acc;
    }, {})
  ;
}

export class LmStudioEmbedModelAdapter extends SmartEmbedModelApiAdapter {
  static key = "lm_studio";

  static defaults = {
    description: "LM Studio",
    type: "API",
    host: "http://localhost:1234",
    // endpoint: "/v1/embeddings",
    endpoint: "/api/v0/embeddings",
    models_endpoint: "/api/v0/models",
    default_model: "",               // user picks from dropdown
    streaming: false,
    api_key: "na",                   // not used
    batch_size: 10,
    max_tokens: 512,
  };

  get req_adapter() {
    return LmStudioEmbedModelRequestAdapter;
  }
  get res_adapter() {
    return LmStudioEmbedModelResponseAdapter;
  }

  get endpoint() {
    return `${this.model_config.host}${this.model_config.endpoint}`;
  }

  get models_endpoint() {
    return `${this.model_config.host}${this.model_config.models_endpoint}`;
  }

  get settings_config() {
    // Start with the base fields then prune / add.
    const cfg = { ...super.settings_config };
    delete cfg["[ADAPTER].api_key"];
    cfg["[ADAPTER].refresh_models"] = {
      name: 'Refresh Models',
      type: "button",
      description: "Refresh the list of available models.",
      callback: 'adapter.refresh_models',
    };
    cfg["[ADAPTER].current_model"] = {
      type: "html",
      value: `<p>Model Max Tokens: ${this.max_tokens}</p>`,
    };
    cfg["[ADAPTER].cors_note"] = {
      name: "CORS required",
      type: "html",
      // The renderer treats `value` as innerHTML.
      value:
        `<p>Before you can call the local endpoint from a browser ` +
        `you must enable <strong>Allow Cross‑Origin Requests (CORS)</strong> ` +
        `inside LM Studio → Settings → OpenAI API Compatible.</p>`,
    };
    return cfg;
  }

  async get_models(refresh = false) {
    if (!refresh && this.adapter_settings.models) return this.adapter_settings.models;

    const resp = await this.http_adapter.request({
      url: this.models_endpoint,
      method: "GET",
    });
    const raw = await resp.json();
    const parsed = this.parse_model_data(raw);
    this.adapter_settings.models = parsed;
    this.model.re_render_settings();
    return parsed;
  }

  parse_model_data(list) {
    return parse_lm_studio_models(list, this.constructor.key);
  }

  async count_tokens(input) {             // just a wrapper
    return { tokens: this.estimate_tokens(input) };
  }

  validate_config() {
    if (!this.adapter_config.model_key) {
      return { valid: false, message: "No model selected." };
    }
    return { valid: true, message: "Configuration is valid." };
  }
  /**
   * Prepare input text and ensure it fits within `max_tokens`.
   * @param {string} embed_input - Raw input text
   * @returns {Promise<string|null>} Processed input text
   */
  async prepare_embed_input(embed_input) {
    if (typeof embed_input !== 'string') throw new TypeError('embed_input must be a string');
    if (embed_input.length === 0) return null;

    const { tokens } = await this.count_tokens(embed_input);
    if (tokens <= this.max_tokens) return embed_input;

    return await this.trim_input_to_max_tokens(embed_input, tokens);
  }
  /**
   * Refresh available models.
   */
  refresh_models() {
    console.log('refresh_models');
    this.get_models(true);
  }

  // no usaqge stats from LM Studio so need to estimate tokens
  async embed_batch(inputs) {
    const token_cts = inputs.map((item) => this.estimate_tokens(item.embed_input));
    const resp = await super.embed_batch(inputs);
    return resp.map((item, idx) => ({ ...item, tokens: token_cts[idx] })); 
  }  

}

/**
 * Request adapter for OpenAI embedding API
 * @class LmStudioEmbedModelRequestAdapter
 * @extends SmartEmbedModelRequestAdapter
 */
class LmStudioEmbedModelRequestAdapter extends SmartEmbedModelRequestAdapter {
  /**
   * Prepare request body for LM Studio API
   * @returns {Object} Request body for API
   */
  prepare_request_body() {
    const body = {
      model: this.adapter.model_config.id,
      input: this.embed_inputs,
    };
    return body;
  }
}

/**
 * Response adapter for OpenAI embedding API
 * @class LmStudioEmbedModelResponseAdapter
 * @extends SmartEmbedModelResponseAdapter
 */
class LmStudioEmbedModelResponseAdapter extends SmartEmbedModelResponseAdapter {
  /**
   * Parse LM Studio API response
   * @returns {Array<Object>} Parsed embedding results
   */
  parse_response() {
    const resp = this.response;
    if (!resp || !resp.data || !resp.usage) {
      console.error("Invalid response format", resp);
      return [];
    }
    const avg_tokens = resp.usage.total_tokens / resp.data.length;
    return resp.data.map((item) => ({
      vec: item.embedding,
      tokens: avg_tokens, // OpenAI doesn't provide tokens per item in batch requests
    }));
  }
}
