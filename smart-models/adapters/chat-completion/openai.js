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
  // "max_completion_tokens": {
  //   name: 'Max completion tokens',
  //   type: 'number',
  //   description: 'Optional. Upper bound for generated tokens, including visible output and reasoning tokens.',
  // },
  // "temperature": {
  //   name: 'Temperature',
  //   type: 'number',
  //   description: 'Optional. Sampling temperature from 0 to 2.',
  // },
  // "top_p": {
  //   name: 'Top P',
  //   type: 'number',
  //   description: 'Optional. Nucleus sampling value from 0 to 1.',
  // },
  // "presence_penalty": {
  //   name: 'Presence penalty',
  //   type: 'number',
  //   description: 'Optional. Value from -2 to 2. Positive values increase new-topic likelihood.',
  // },
  // "frequency_penalty": {
  //   name: 'Frequency penalty',
  //   type: 'number',
  //   description: 'Optional. Value from -2 to 2. Positive values reduce repeated lines.',
  // },
  "reasoning_effort": {
    name: 'Reasoning effort',
    type: 'dropdown',
    description: 'Optional. Controls effort on reasoning for supported models.',
    options_callback: () => [
      {value: '', name: 'Default'},
      {value: 'none', name: 'None'},
      {value: 'minimal', name: 'Minimal'},
      {value: 'low', name: 'Low'},
      {value: 'medium', name: 'Medium'},
      {value: 'high', name: 'High'},
      {value: 'xhigh', name: 'Extra High'}
    ],
  },
  "verbosity": {
    name: 'Verbosity',
    type: 'dropdown',
    description: 'Optional. Controls response verbosity for supported models.',
    options_callback: () => [
      {value: '', name: 'Default'},
      {value: 'low', name: 'Low'},
      {value: 'medium', name: 'Medium'},
      {value: 'high', name: 'High'}
    ],
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
