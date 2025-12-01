import {
  SmartChatModelOpenRouterAdapter,
} from "smart-chat-model/adapters/open_router.js";

export class OpenRouterChatCompletionModelAdapter extends SmartChatModelOpenRouterAdapter {
  constructor(model_item) {
    super(model_item);
  }

  // Backward compatibility
  // get adapter_config() { return this.model.settings; }
  // get adapter_settings() { return this.model.settings; }
  // get model_config () { return this.model.settings; }
  // get opts () { return this.model.settings; }
  get http_adapter() {
    if (!this._http_adapter) {
      const HttpClass = this.model.env.config.modules.http_adapter.class;
      const http_params = {...this.model.env.config.modules.http_adapter, class: undefined};
      this._http_adapter = new HttpClass(http_params);
    }
    return this._http_adapter;
  }
}
function add_backward_compatibility(_class) {
  // getters for backward compatibility
  Object.defineProperty(_class.prototype, 'adapter_config', {
    get: function() { return this.model.settings; }
  });
  Object.defineProperty(_class.prototype, 'adapter_settings', {
    get: function() { return this.model.settings; }
  });
  Object.defineProperty(_class.prototype, 'model_config', {
    get: function() { return this.model.settings; }
  });
  Object.defineProperty(_class.prototype, 'opts', {
    get: function() { return this.model.settings; }
  });
}
add_backward_compatibility(OpenRouterChatCompletionModelAdapter);

const settings_config = {
  "api_key": {
    name: 'API Key',
    type: "password",
    description: "Enter your API key for the chat model provider.",
    callback: 'test_api_key',
    is_scope: true, // trigger re-render of settings when changed (reload models dropdown)
  },
};

export default {
  class: OpenRouterChatCompletionModelAdapter,
  settings_config,
};
