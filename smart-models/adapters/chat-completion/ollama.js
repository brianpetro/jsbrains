import {
  SmartChatModelOllamaAdapter,
} from "smart-chat-model/adapters/ollama.js";

export class OllamaChatCompletionModelAdapter extends SmartChatModelOllamaAdapter {
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
  // "api_key": {
  //   name: 'API Key',
  //   type: "password",
  //   description: "Enter your Ollama API key.",
  // },
  "host": {
    name: 'Ollama host',
    type: 'text',
    description: 'Enter the host for your Ollama instance',
    default: 'http://localhost:11434',
  }
};
export default {
  class: OllamaChatCompletionModelAdapter,
  settings_config,
};
