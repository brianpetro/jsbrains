import {
  SmartEmbedOllamaAdapter,
} from "smart-embed-model/adapters/ollama.js";
export class OllamaEmbeddingModelAdapter extends SmartEmbedOllamaAdapter {
  constructor(model_item) {
    super(model_item);
    // this.opts = model_item; // backward compatibility
  }
  /**
   * Get HTTP request adapter instance
   * @returns {SmartHttpRequest} HTTP request handler
   */
  get http_adapter() {
    if (!this._http_adapter) {
      const HttpClass = this.model.env.config.modules.http_adapter.class;
      const http_params = {...this.model.env.config.modules.http_adapter, class: undefined};
      this._http_adapter = new HttpClass(http_params);
    }
    return this._http_adapter;
  }
}
export const settings_config = {
  host: {
    name: 'Ollama host',
    type: 'text',
    description: 'Enter the host for your Ollama instance',
    default: "http://localhost:11434",
  }
}
export default {
  class: OllamaEmbeddingModelAdapter,
  settings_config,
};