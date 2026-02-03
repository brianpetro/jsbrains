import {
  SmartChatModelApiAdapter,
  SmartChatModelRequestAdapter,
  SmartChatModelResponseAdapter
} from "smart-chat-model/adapters/_api.js";

/**
 * Join a base URL with a path safely.
 * - Removes trailing slash from base_url
 * - Ensures path starts with a single leading slash
 *
 * @param {string} base_url
 * @param {string} path
 * @returns {string}
 */
function join_url(base_url, path) {
  const normalized_base_url = String(base_url || '').trim().replace(/\/+$/, '');
  let normalized_path = String(path || '').trim();
  if (!normalized_path.startsWith('/')) normalized_path = `/${normalized_path}`;
  return `${normalized_base_url}${normalized_path}`;
}

/**
 * Request adapter that adds LiteLLM custom key header if configured.
 */
class SmartChatModelLiteLLMRequestAdapter extends SmartChatModelRequestAdapter {
  get_headers() {
    const headers = super.get_headers();
    const header_name = (this.adapter.model.data.litellm_key_header_name || '').trim();
    if (header_name && this.adapter.api_key) {
      // LiteLLM expects "Bearer <key>" in the custom header, mirroring Authorization.
      headers[header_name] = `${this.adapter.api_key}`;
    }
    return headers;
  }
}

export class LiteLllmChatCompletionAdapter extends SmartChatModelApiAdapter {
  static key = 'litellm';

  static defaults = {
    description: 'LiteLLM Proxy (OpenAI-compatible)',
    type: 'API',
    adapter: 'LiteLLM_Proxy',
    streaming: true,

    // NO DEFAULT HOST (PREVENT OVERRIDE ON SAVE)
    // host: 'http://localhost:4000',

    // OpenAI-style paths relative to base_url
    endpoint: '/chat/completions',
    models_endpoint: '/models',

    default_model: '',
    signup_url: 'https://docs.litellm.ai/docs/'
  };

  get req_adapter() { return SmartChatModelLiteLLMRequestAdapter; }
  get res_adapter() { return SmartChatModelResponseAdapter; }

  get host() {
    const host = this.model.data.host || this.constructor.defaults.host;
    return host;
  }

  get endpoint() {
    return join_url(this.host, this.constructor.defaults.endpoint);
  }

  get endpoint_streaming() {
    return this.endpoint;
  }

  get models_endpoint() {
    return join_url(this.host, this.constructor.defaults.models_endpoint);
  }

  get models_endpoint_method() { return 'GET'; }

  /**
   * Optional: support LiteLLM deployments configured to accept the key
   * in a custom header (litellm_key_header_name).
   * When set, we send the same value used for Authorization.
   *
   * @returns {string}
   */
  get litellm_key_header_name() {
    return (this.model.data.litellm_key_header_name || '').trim();
  }

  /**
   * Override model-list request params to include optional custom key header.
   */
  get models_request_params() {
    const headers = {};
    if (this.api_key) {
      headers['Authorization'] = `Bearer ${this.api_key}`;
      if (this.litellm_key_header_name) {
        headers[this.litellm_key_header_name] = `Bearer ${this.api_key}`;
      }
    }
    return {
      url: this.models_endpoint,
      method: this.models_endpoint_method,
      ...(Object.keys(headers).length ? { headers } : {})
    };
  }
  /**
   * Get available models from the API.
   * @param {boolean} [refresh=false] - Whether to refresh cached models
   * @returns {Promise<Object>} Map of model objects
   */
  async get_models(refresh=false) {
    if(!refresh && this.valid_model_data()) return this.model_data; // return cached models if not refreshing
    // if(this.api_key) {
      let response;
      try {
        response = await this.http_adapter.request(this.models_request_params);
        this.model_data = this.parse_model_data(await response.json());
      } catch (error) {
        console.error('Failed to fetch model data:', { error, response });
        // return {"_": {id: `Failed to fetch models from ${this.model.adapter_name}`}};
      }
    // }
    this.model_data = await this.get_enriched_model_data();
    this.model_data_loaded_at = Date.now();
    if(this.model.data) {
      this.model.data.provider_models = this.model_data;
    }
    if(this.valid_model_data() && typeof this.model.re_render_settings === 'function') setTimeout(() => {
      this.model.re_render_settings();
    }, 100);
    else console.warn('Invalid model data, not re-rendering settings');
    return this.model_data;

  }

  /**
   * LiteLLM proxy usually returns OpenAI-style:
   * { data: [ { id, object, created, owned_by }, ... ] }
   *
   * @param {Object} model_data
   * @returns {Object<string, Object>}
   */
  parse_model_data(model_data = {}) {
    console.log('LiteLLM parse_model_data', model_data);
    const list = Array.isArray(model_data?.data)
      ? model_data.data
      : Array.isArray(model_data?.models)
        ? model_data.models
        : Array.isArray(model_data)
          ? model_data
          : []
    ;

    if (!Array.isArray(list) || list.length === 0) {
      return { _: { id: 'No models found.' } };
    }

    const parsed = {};
    for (const m of list) {
      const id = m?.id || m?.model || m?.name;
      if (!id) continue;

      const maybe_context = m?.context_length || m?.context_window || m?.max_input_tokens;
      const maybe_multimodal =
        Boolean(m?.multimodal)
        || String(id).includes('vision')
        || String(id).includes('multimodal')
      ;

      parsed[id] = {
        id,
        model_name: id,
        name: m?.name || id,
        description: m?.description || `LiteLLM model: ${id}`,
        ...(typeof maybe_context === 'number' ? { max_input_tokens: maybe_context } : {}),
        multimodal: maybe_multimodal,
        raw: m
      };
    }

    if (!Object.keys(parsed).length) {
      return { _: { id: 'No models found.' } };
    }

    return parsed;
  }

  /**
   * No dedicated token endpoint; rough estimate.
   * @param {string|Object} input
   * @returns {Promise<number>}
   */
  async count_tokens(input) {
    const text = typeof input === 'string' ? input : JSON.stringify(input || {});
    return Math.ceil(text.length / 4);
  }

  /**
   * Attempt to validate connectivity/auth by listing models.
   * @returns {Promise<boolean>}
   */
  async test_api_key() {
    try {
      const models = await this.get_models(true);
      return Boolean(models && typeof models === 'object' && Object.keys(models).length);
    } catch {
      return false;
    }
  }

  get http_adapter() {
    if (!this._http_adapter) {
      const HttpClass = this.model.env.config.modules.http_adapter.class;
      const http_params = { ...this.model.env.config.modules.http_adapter, class: undefined };
      this._http_adapter = new HttpClass(http_params);
    }
    return this._http_adapter;
  }
}

export const settings_config = {
  api_key: {
    name: 'API Key',
    type: 'password',
    description: 'Enter your API key (if your proxy requires auth).',
    placeholder: 'Enter LiteLLM key'
  },
  host: {
    name: 'LiteLLM base URL',
    type: 'text',
    description:
      'Base URL for LiteLLM Proxy (ex: http://localhost:4000  OR  https://your-proxy.example.com/v1)',
  },
  litellm_key_header_name: {
    name: 'API key header name',
    type: 'text',
    description:
      'Optional. The adapter will send API key in that header.'
  },
  litellm_note: {
    name: 'Note about LiteLLM endpoints',
    type: 'html',
    value:
      '<p class="model-note">' +
      'This is an expert-level integration. For example, Lite LLM requires managing a proxy API.' +
      '<br><b>Base URL:</b> If no models in list after changing base URL, close this dialog and reopen it with the "Edit" button on the settings page.' +
      '</p>'
  }
};

export default {
  class: LiteLllmChatCompletionAdapter,
  settings_config
};
