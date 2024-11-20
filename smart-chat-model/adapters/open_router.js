import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

export class SmartChatModelOpenRouterAdapter extends SmartChatModelApiAdapter {
  static defaults = {
    description: "Open Router",
    type: "API",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    streaming: true,
    adapter: "OpenRouter",
    models_endpoint: "https://openrouter.ai/api/v1/models",
    default_model: "mistralai/mistral-7b-instruct:free",
    signup_url: "https://accounts.openrouter.ai/sign-up?redirect_url=https%3A%2F%2Fopenrouter.ai%2Fkeys"
  };
  get req_adapter() { return SmartChatModelOpenRouterRequestAdapter; }
  get res_adapter() { return SmartChatModelOpenRouterResponseAdapter; }

  get api_key(){
    return this.main.opts.api_key // opts added at init take precedence
      || this.adapter_settings?.api_key // then adapter settings
      || process.env.DEFAULT_OPEN_ROUTER_API_KEY
    ;

  }

  async count_tokens(input) {
    // OpenRouter doesn't provide a token counting endpoint, so we'll use a rough estimate
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    return Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 characters
  }

  get endpoint() {
    return 'https://openrouter.ai/api/v1/chat/completions';
  }

  get models_request_params() {
    return {
      url: this.models_endpoint,
      method: 'GET',
    };
  }

  parse_model_data(model_data) {
    if(model_data.data) {
      model_data = model_data.data;
    }
    if(model_data.error) throw new Error(model_data.error);
    console.log('model_data', model_data);
    return model_data.reduce((acc, model) => {
      acc[model.id] = {
        model_name: model.id,
        id: model.id,
        max_input_tokens: model.context_length,
        description: model.name,
        actions: model.description.includes('tool use') || model.description.includes('function call'),
        multimodal: model.architecture.modality === 'multimodal',
        raw: model
      };
      return acc;
    }, {});
  }

}

export class SmartChatModelOpenRouterRequestAdapter extends SmartChatModelRequestAdapter {
  to_platform() { return this.to_openai(); }

}

export class SmartChatModelOpenRouterResponseAdapter extends SmartChatModelResponseAdapter {
  to_platform() { return this.to_openai(); }
  get object() { return 'chat.completion'; }
}