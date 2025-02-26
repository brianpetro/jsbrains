import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

/**
 * Adapter for OpenRouter's API.
 * Provides access to multiple model providers through a unified API.
 * @class SmartChatModelOpenRouterAdapter
 * @extends SmartChatModelApiAdapter
 * 
 */
export class SmartChatModelOpenRouterAdapter extends SmartChatModelApiAdapter {
  static key = "open_router";
  static defaults = {
    description: "Open Router",
    type: "API",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    streaming: true,
    adapter: "OpenRouter",
    models_endpoint: "https://openrouter.ai/api/v1/models",
    default_model: "mistralai/mistral-7b-instruct:free",
    signup_url: "https://accounts.openrouter.ai/sign-up?redirect_url=https%3A%2F%2Fopenrouter.ai%2Fkeys",
    can_use_tools: true,
  };

  /**
   * Get request adapter class
   * @returns {typeof SmartChatModelOpenRouterRequestAdapter} Request adapter class
   */
  get req_adapter() { return SmartChatModelOpenRouterRequestAdapter; }

  /**
   * Get response adapter class
   * @returns {typeof SmartChatModelOpenRouterResponseAdapter} Response adapter class
   */
  get res_adapter() { return SmartChatModelOpenRouterResponseAdapter; }

  /**
   * Get API key from various sources
   * @returns {string|undefined} API key if available
   */
  get api_key(){
    return this.main.opts.api_key // opts added at init take precedence
      || this.adapter_settings?.api_key // then adapter settings
      || process.env.DEFAULT_OPEN_ROUTER_API_KEY
    ;
  }

  /**
   * Count tokens in input text (rough estimate)
   * @param {string|Object} input - Text to count tokens for
   * @returns {Promise<number>} Estimated token count
   */
  async count_tokens(input) {
    // OpenRouter doesn't provide a token counting endpoint, so we'll use a rough estimate
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    return Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 characters
  }

  get models_request_params() {
    return {
      url: this.models_endpoint,
      method: 'GET',
    };
  }
  
  /**
   * Parse model data from OpenRouter API response
   * @param {Object} model_data - Raw model data
   * @returns {Object} Map of model objects with capabilities and limits
   */
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
        can_use_tools: model.description.includes('tool use') || model.description.includes('function call'),
        multimodal: model.architecture.modality === 'multimodal',
        raw: model
      };
      return acc;
    }, {});
  }
}

/**
 * Request adapter for OpenRouter API
 * @class SmartChatModelOpenRouterRequestAdapter
 * @extends SmartChatModelRequestAdapter
 */
export class SmartChatModelOpenRouterRequestAdapter extends SmartChatModelRequestAdapter {
  to_platform(stream = false) {
    const req = this.to_openai(stream);
    // const body = JSON.parse(req.body);
    // if(typeof body.tool_choice === 'object'){
    //   const tool_name = body.tool_choice.function.name;
    //   const last_message = body.messages[body.messages.length - 1];
    //   if(typeof last_message.content === 'string'){
    //     last_message.content += `\n\nUse the "${tool_name}" tool.`;
    //   }else if(Array.isArray(last_message.content)){
    //     const text_part = last_message.content.find(part => part.type === 'text');
    //     if(text_part){
    //       text_part.text += `\n\nUse the "${tool_name}" tool.`;
    //     }else{
    //       const text = {
    //         type: 'text',
    //         text: `Use the "${tool_name}" tool.`,
    //       };
    //       last_message.content.push(text);
    //     }
    //   }
    //   // delete body.tool_choice;
    //   body.tool_choice = 'auto';
    // }
    // req.body = JSON.stringify(body);
    return req;
  }

  _get_openai_content(message) {
    // if user message
    if(message.role === 'user'){
      // if content is an array and all parts are type 'text'
      if(Array.isArray(message.content) && message.content.every(part => part.type === 'text')){
        return message.content.map(part => part.text).join('\n');
      }
    }
    return message.content;
  }
}
/**
 * Response adapter for OpenRouter API
 * @class SmartChatModelOpenRouterResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
export class SmartChatModelOpenRouterResponseAdapter extends SmartChatModelResponseAdapter {
  static get platform_res() {
    return {
      id: '',
      object: 'chat.completion',
      created: 0,
      model: '',
      choices: [],
      usage: {},
    };
  }
  to_platform() { return this.to_openai(); }
  get object() { return 'chat.completion'; }
  get error() {
    if(!this._res.error) return null;
    const error = this._res.error;
    if(!error.message) error.message = '';
    if(this._res.error.metadata?.raw){
      if(typeof this._res.error.metadata.raw === 'string'){
        error.message += `\n\n${this._res.error.metadata.raw}`;
      }else{
        error.message += `\n\n${JSON.stringify(this._res.error.metadata.raw, null, 2)}`;
      }
    }
    return error;
  }
}