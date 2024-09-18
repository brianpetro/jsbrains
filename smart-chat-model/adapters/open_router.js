import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

export class SmartChatModelOpenRouterAdapter extends SmartChatModelApiAdapter {
  get req_adapter() { return SmartChatModelOpenRouterRequestAdapter; }
  get res_adapter() { return SmartChatModelOpenRouterResponseAdapter; }

  async count_tokens(input) {
    // OpenRouter doesn't provide a token counting endpoint, so we'll use a rough estimate
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    return Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 characters
  }

  get endpoint() {
    return 'https://openrouter.ai/api/v1/chat/completions';
  }

  parse_model_data(model_data) {
    if(model_data.data) {
      model_data = model_data.data;
    }
    return model_data.map(model => ({
      model_name: model.id,
      key: model.id,
      max_input_tokens: model.context_length,
      description: model.name,
      actions: model.description.includes('tool use') || model.description.includes('function call'),
      multimodal: model.architecture.modality === 'multimodal',
      raw: model
    }));
  }
}

export class SmartChatModelOpenRouterRequestAdapter extends SmartChatModelRequestAdapter {
  to_platform() { return this.to_openai(); }

}

export class SmartChatModelOpenRouterResponseAdapter extends SmartChatModelResponseAdapter {
  to_platform() { return this.to_openai(); }
  get object() { return 'chat.completion'; }
}