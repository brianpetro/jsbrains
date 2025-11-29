import {
  SmartChatModelOpenRouterAdapter,
} from "smart-chat-model/adapters/open_router.js";

export class OpenRouterChatCompletionModelAdapter extends SmartChatModelOpenRouterAdapter {
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
  class: OpenRouterChatCompletionModelAdapter,
};
