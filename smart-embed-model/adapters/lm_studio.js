import {
  SmartEmbedModelApiAdapter,
  SmartEmbedModelRequestAdapter,
  SmartEmbedModelResponseAdapter,
} from "./_api.js";

/**
 * Normalize LM Studio model
 * Pure and reusable.
 * @param {Object} list - Response from LM Studio `/api/v0/models` endpoint
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
        max_tokens: m.loaded_context_length || m.max_context_length || 512,
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
    batch_size: 10,
    max_tokens: 512,
  };

  static sync_model_data(model_item) {
    if (!model_item.data.api_key && !model_item.secrets?.api_key) return false;

    model_item.api_key = "";
    model_item.queue_save?.();
    return true;
  }

  get req_adapter() {
    return LmStudioEmbedModelRequestAdapter;
  }
  get res_adapter() {
    return LmStudioEmbedModelResponseAdapter;
  }

  get host() {
    return this.model.data.host || this.constructor.defaults.host;
  }

  get endpoint() {
    return `${this.host}${this.constructor.defaults.endpoint}`;
  }

  get models_endpoint() {
    return `${this.host}${this.constructor.defaults.models_endpoint}`;
  }

  get api_key() {
    return "local";
  }

  prepare_request_headers() {
    return {
      "Content-Type": "application/json",
    };
  }

  async load() {
    if (this.is_loaded) return;
    if (this._load_promise) return await this._load_promise;

    this._load_promise = (async () => {
      if (!this.model_key) {
        await super.load();
        return;
      }

      const cached_model = this.model.data.provider_models?.[this.model_key];
      const models = cached_model
        ? this.model.data.provider_models
        : await this.get_models(true)
      ;
      if (!models[this.model_key]) {
        await super.load();
        return;
      }

      // LM Studio model metadata does not expose embedding dimensions.
      const [result] = await this.embed_batch([{ embed_input: "test" }]);
      const dims = result?.vec?.length;
      if (!dims) {
        throw new Error(
          `Unable to determine embedding dimensions for ${this.model_key || "LM Studio model"}.`,
        );
      }

      const selected_model = this.model.data.provider_models?.[this.model_key];
      const dims_changed = this.model.data.dims !== dims;
      const selected_model_changed = selected_model && selected_model.dims !== dims;

      if (dims_changed) this.model.data.dims = dims;
      if (selected_model) selected_model.dims = dims;
      if (dims_changed || selected_model_changed) this.model.queue_save?.();

      await super.load();
    })();

    try {
      return await this._load_promise;
    } finally {
      this._load_promise = null;
    }
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
      value: `<p>Embedding Model Max Tokens: ${this.max_tokens} (may be configured in LM Studio)</p>`,
    };
    cfg["[ADAPTER].batch_size"] = {
      name: 'Embedding Batch Size',
      type: "number",
      description: "Number of embeddings to process in parallel. Adjusting this may improve performance.",
      value: this.batch_size,
      default: this.constructor.defaults.batch_size,
    };
    cfg["[ADAPTER].cors_note"] = {
      name: "CORS required",
      type: "html",
      // The renderer treats `value` as innerHTML.
      value:
        `<p>Before you can use LM Studio ` +
        `you must <strong>Enable CORS</strong> ` +
        `inside LM Studio → Developer → Settings</p>`,
    };
    return cfg;
  }

  async get_models(refresh = false) {
    if (this._get_models_promise) return await this._get_models_promise;
    if (!refresh && this.model.data.provider_models) return this.model.data.provider_models;

    this._get_models_promise = (async () => {
      const resp = await this.http_adapter.request({
        url: this.models_endpoint,
        method: "GET",
      });
      const raw = await resp.json();
      const parsed = this.parse_model_data(raw);
      this.model.data.provider_models = parsed;
      this.model.re_render_settings?.();
      return parsed;
    })();

    try {
      return await this._get_models_promise;
    } finally {
      this._get_models_promise = null;
    }
  }

  parse_model_data(list) {
    return parse_lm_studio_models(list, this.constructor.key);
  }

  async count_tokens(input) {             // just a wrapper
    return { tokens: this.estimate_tokens(input) };
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
    resp.forEach((item, idx) => { item.tokens = token_cts[idx] });
    return resp;
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
      model: this.model_id,
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
    if (!resp || !resp.data) {
      console.error("Invalid response format", resp);
      return [];
    }
    return resp.data.map((item) => ({
      vec: item.embedding,
      tokens: null, // LM Studio doesn't provide token usage
    }));
  }
}
