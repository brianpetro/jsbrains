import {
  SmartChatModelOpenaiAdapter,
} from "smart-chat-model/adapters/openai.js";

export class OpenAIChatCompletionModelAdapter extends SmartChatModelOpenaiAdapter {
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
    description: "Enter your OpenAI API key.",
  },
  "openai_note": {
    name: 'Note about using OpenAI',
    type: "html",
    value: "<b>OpenAI models:</b> Some models require extra verification steps in your OpenAI account for them to appear in the model list.",
  }
};

export default {
  class: OpenAIChatCompletionModelAdapter,
  settings_config,
};
