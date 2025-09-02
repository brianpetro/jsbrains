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
  return list.data.reduce((acc, m) => {
    acc[m.id] = {
      id: m.id,
      model_name: m.id,
      // LM Studio does not report dims/context; leave sensible defaults
      dims: 768,
      max_tokens: 512,
      description: `LM Studio model: ${m.id}`,
      adapter: adapter_key,
    };
    return acc;
  }, {});
}

export class LmStudioEmbedModelAdapter extends SmartEmbedModelApiAdapter {
  static key = "lm_studio";

  static defaults = {
    description: "LM Studio (OpenAI‑compatible)",
    type: "API",
    endpoint: "http://localhost:1234/v1/embeddings",
    models_endpoint: "http://localhost:1234/v1/models",
    default_model: "",               // user picks from dropdown
    streaming: false,
    api_key: "na",                   // not used
    adapter: "LM_Studio_Embeddings",
  };

  get req_adapter() {                 // OpenAI wire‑format; nothing special
    return SmartEmbedModelRequestAdapter;
  }
  get res_adapter() {
    return SmartEmbedModelResponseAdapter;
  }

  get settings_config() {
    // Start with the base fields then prune / add.
    const cfg = { ...super.settings_config };
    delete cfg["[ADAPTER].api_key"];

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
}
