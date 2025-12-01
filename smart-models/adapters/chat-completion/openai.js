import {
  SmartChatModelOpenaiAdapter,
} from "smart-chat-model/adapters/openai.js";

export class OpenAIChatCompletionModelAdapter extends SmartChatModelOpenaiAdapter {
  constructor(model_item) {
    super(model_item);
  }

  get adapter_settings() {
    return this.model.settings;
  }

  get http_adapter() {
    if (!this._http_adapter) {
      const HttpClass = this.model.env.config.modules.http_adapter.class;
      const http_params = {...this.model.env.config.modules.http_adapter, class: undefined};
      this._http_adapter = new HttpClass(http_params);
    }
    return this._http_adapter;
  }

  get api_key() {
    return this.model.provider.data.api_key;
  }

}
const settings_config = {
  "api_key": {
    name: 'API Key',
    type: "password",
    description: "Enter your OpenAI API key.",
  },
};

export default {
  class: OpenAIChatCompletionModelAdapter,
  settings_config,
};
