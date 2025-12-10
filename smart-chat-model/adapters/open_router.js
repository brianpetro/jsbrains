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
  static models_dev_key = "openrouter";
  static defaults = {
    description: "Open Router",
    type: "API",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    streaming: true,
    adapter: "OpenRouter",
    models_endpoint: "https://openrouter.ai/api/v1/models",
    default_model: "mistralai/mistral-7b-instruct:free",
    signup_url: "https://accounts.openrouter.ai/sign-up?redirect_url=https%3A%2F%2Fopenrouter.ai%2Fkeys",
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
    return model_data.reduce((acc, model) => {
      acc[model.id] = {
        model_name: model.id,
        id: model.id,
        max_input_tokens: model.context_length,
        name: model.name,
        description: model.name,
        long_desc: model.description,
        multimodal: model.architecture.modality === 'multimodal',
        raw: model
      };
      return acc;
    }, {});
  }
}

// {
//     "id": "deepseek/deepseek-v3.2-speciale",
//     "canonical_slug": "deepseek/deepseek-v3.2-speciale-20251201",
//     "hugging_face_id": "deepseek-ai/DeepSeek-V3.2-Speciale",
//     "name": "DeepSeek: DeepSeek V3.2 Speciale",
//     "created": 1764594837,
//     "description": "DeepSeek-V3.2-Speciale is a high-compute variant of DeepSeek-V3.2 optimized for maximum reasoning and agentic performance. It builds on DeepSeek Sparse Attention (DSA) for efficient long-context processing, then scales post-training reinforcement learning to push capability beyond the base model. Reported evaluations place Speciale ahead of GPT-5 on difficult reasoning workloads, with proficiency comparable to Gemini-3.0-Pro, while retaining strong coding and tool-use reliability. Like V3.2, it benefits from a large-scale agentic task synthesis pipeline that improves compliance and generalization in interactive environments.",
//     "context_length": 131072,
//     "architecture": {
//         "modality": "text->text",
//         "input_modalities": [
//             "text"
//         ],
//         "output_modalities": [
//             "text"
//         ],
//         "tokenizer": "DeepSeek",
//         "instruct_type": null
//     },
//     "pricing": {
//         "prompt": "0.00000028",
//         "completion": "0.00000042",
//         "request": "0",
//         "image": "0",
//         "web_search": "0",
//         "internal_reasoning": "0",
//         "input_cache_read": "0.000000028"
//     },
//     "top_provider": {
//         "context_length": 131072,
//         "max_completion_tokens": 64000,
//         "is_moderated": false
//     },
//     "per_request_limits": null,
//     "supported_parameters": [
//         "frequency_penalty",
//         "include_reasoning",
//         "logprobs",
//         "max_tokens",
//         "presence_penalty",
//         "reasoning",
//         "stop",
//         "temperature",
//         "top_logprobs",
//         "top_p"
//     ],
//     "default_parameters": {
//         "temperature": 1,
//         "top_p": 0.95,
//         "frequency_penalty": null
//     }
// }

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
    if(error.message.startsWith('No cookie auth')) {
      error.suggested_action = 'Ensure your Open Router API key is set correctly.';
    }
    return error;
  }
}