import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

export class SmartChatModelOpenRouterAdapter extends SmartChatModelApiAdapter {
  static config = {
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

  /**
   * Get the available models from the platform.
   * @param {boolean} [refresh=false] - Whether to refresh the cached models.
   * @returns {Promise<Object>} An object of model objects.
   */
  async get_models(refresh=false) {
    if(!this.adapter_settings.models_endpoint){
      if(typeof this.adapter_settings.models === 'object' && Object.keys(this.adapter_settings.models).length > 0) return this.adapter_settings.models;
      // else throw new Error("models_endpoint or adapter_settings.models object is required");
    }
    if(!refresh && this.adapter_settings?.models) return this.adapter_settings.models; // return cached models if not refreshing
    if(!this.api_key) {
      console.warn('No API key provided to retrieve models');
      return {};
    }
    try {
      const request_params = {
        url: this.models_endpoint,
        method: 'GET',
      };
      console.log('request_params', request_params);
      const response = await this.http_adapter.request(request_params);
      console.log('response', response);
      const model_data = this.parse_model_data(await response.json());
      console.log('model_data', model_data);
      this.adapter_settings.models = model_data;
      return model_data;
    } catch (error) {
      console.error('Failed to fetch model data:', error);
      return {};
    }
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