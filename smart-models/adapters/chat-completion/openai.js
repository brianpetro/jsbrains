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
}

export default {
  class: OpenAIChatCompletionModelAdapter,
};
