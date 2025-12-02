import {
  SmartChatModelApiAdapter,
  SmartChatModelRequestAdapter,
  SmartChatModelResponseAdapter
} from './_api.js';

/**
 * Adapter for **xAI Grok** REST API.
 *
 * Grok’s HTTP interface is intentionally OpenAI-compatible, so the
 * default request/response converters are sufficient.  We only need to
 * supply the Grok-specific endpoints, headers and (optionally) a model
 * list parser.
 *
 * @see https://docs.x.ai/docs/guides/chat
 * @see https://docs.x.ai/docs/api-reference#chat-completions
 *
 * @class SmartChatModelXaiAdapter
 * @extends SmartChatModelApiAdapter
 */
export class SmartChatModelXaiAdapter extends SmartChatModelApiAdapter {
  /** Human-readable platform key used by SmartChatModel */
  static key = 'xai';

  /** @type {import('./_adapter.js').SmartChatModelAdapter['constructor']['defaults']} */
  static defaults = {
    description: 'xAI Grok',
    type: 'API',
    adapter: 'xAI_Grok',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    streaming: true,
    models_endpoint: 'https://api.x.ai/v1/models',
    default_model: 'grok-3-mini-beta',
    signup_url: 'https://ide.x.ai',
  };

  /** Grok is OpenAI-compatible → reuse the stock adapters */
  get req_adapter () { return SmartChatModelRequestAdapter; }
  get res_adapter () { return SmartChatModelResponseAdapter; }

  /* ------------------------------------------------------------------ *
   *  Model-list helpers
   * ------------------------------------------------------------------ */

  /**
   * The Grok `/v1/models` route is **GET**, not POST.
   * Override the HTTP verb so `get_models()` works.
   * @returns {string} 'GET'
   */
  get models_endpoint_method () { return 'GET'; }

  /**
   * Parse `/v1/models` payload to the canonical shape used by SmartChat.
   *
   * Grok returns:
   * ```json
   * { "object":"list",
   *   "data":[{ "id":"grok-3-beta", "context_length":128000, …}] }
   * ```
   */
  parse_model_data (model_data = {}) {
    const list = model_data.data || model_data.models || [];
    return list.reduce((acc, m) => {
      const id = m.id || m.name;
      acc[id] = {
        id,
        model_name: id,
        description: m.description || `context: ${m.context_length || 'n/a'}`,
        max_input_tokens: m.context_length || 128000,
        multimodal: !!m.modality && m.modality.includes('vision'),
        raw: m
      };
      return acc;
    }, {});
  }

}
