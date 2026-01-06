import {
  GeminiEmbedModelAdapter,
} from "smart-embed-model/adapters/gemini.js";

export class GoogleGeminiEmbeddingModelAdapter extends GeminiEmbedModelAdapter {
  constructor(model_item) {
    super(model_item);
  }

  get http_adapter() {
    if (!this._http_adapter) {
      const HttpClass = this.model.env.config.modules.http_adapter.class;
      const http_params = {...this.model.env.config.modules.http_adapter, class: undefined};
      this._http_adapter = new HttpClass(http_params);
    }
    return this._http_adapter;
  }
}
const settings_config = {
  api_key: {
    name: 'API Key',
    type: "password",
    description: "Enter your Google Gemini API key.",
  },
  "gemini_note": {
    name: 'Note about using Gemini Embeddings API',
    type: "html",
    value: "<b>Gemini rate-limiting:</b> Google may impose rate limits on the Gemini Embeddings API. Smart Environment will attempt to retry. Retry details can be found in the developer console logs. Consistent rate limit errors may prevent all items from being properly embedded. Restarting Obsidian will attempt to re-embed any failed items. If you continue to experience issues, try disabling blocks to reduce the number of embeddings required by your Smart Environment.",
  }
};

export default {
  class: GoogleGeminiEmbeddingModelAdapter,
  settings_config
};
