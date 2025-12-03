import {
  SmartChatModelXaiAdapter,
} from "smart-chat-model/adapters/xai.js";

export class XaiChatCompletionModelAdapter extends SmartChatModelXaiAdapter {
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
  "api_key": {
    name: 'API Key',
    type: "password",
    description: "Enter your xAI API key.",
  },
};

export default {
  class: XaiChatCompletionModelAdapter,
  settings_config,
};
