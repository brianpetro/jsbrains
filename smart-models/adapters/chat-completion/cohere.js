import {
  SmartChatModelCohereAdapter,
} from "smart-chat-model/adapters/cohere.js";

export class CohereChatCompletionModelAdapter extends SmartChatModelCohereAdapter {
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
    description: "Enter your Cohere API key.",
  },
};
export default {
  class: CohereChatCompletionModelAdapter,
  settings_config,
};
