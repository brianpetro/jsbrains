import {
  SmartChatModelAnthropicAdapter,
} from "smart-chat-model/adapters/anthropic.js";
import { add_backward_compatibility } from "../../utils/add_backward_compatibility.js";

export class AnthropicChatCompletionModelAdapter extends SmartChatModelAnthropicAdapter {
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
    description: "Enter your Anthropic API key.",
  },
};

add_backward_compatibility(AnthropicChatCompletionModelAdapter);
export default {
  class: AnthropicChatCompletionModelAdapter,
  settings_config,
};
