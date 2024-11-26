import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from "./_api.js";

/**
 * Adapter for Ollama's local API.
 * Handles communication with locally running Ollama instance.
 * @class SmartChatModelOllamaAdapter
 * @extends SmartChatModelApiAdapter
 */
export class SmartChatModelOllamaAdapter extends SmartChatModelApiAdapter {
  static defaults = {
    description: "Ollama (Local)",
    type: "API",
    models_endpoint: "http://localhost:11434/api/tags",
    endpoint: "http://localhost:11434/api/chat",
    api_key: 'na',
    // streaming: false, // TODO: Implement streaming
    streaming: true,
  }

  req_adapter = SmartChatModelOllamaRequestAdapter;
  res_adapter = SmartChatModelOllamaResponseAdapter;

  /**
   * Get parameters for models request - no auth needed for local instance
   * @returns {Object} Request parameters
   */
  get models_request_params() {
    return {
      url: this.adapter_config.models_endpoint,
    };
  }

  /**
   * Get available models from local Ollama instance
   * @param {boolean} [refresh=false] - Whether to refresh cached models
   * @returns {Promise<Object>} Map of model objects
   */
  async get_models(refresh=false) {
    console.log('get_models', refresh);
    if(!refresh
      && this.adapter_config?.models
      && typeof this.adapter_config.models === 'object'
      && Object.keys(this.adapter_config.models).length > 0
    ) return this.adapter_config.models; // return cached models if not refreshing
    try {
      console.log('models_request_params', this.models_request_params);
      const list_resp = await this.http_adapter.request(this.models_request_params);
      console.log('list_response', list_resp);
      const list_data = await list_resp.json();
      // get model details for each model in list
      const models_raw_data = [];
      for(const model of list_data.models){
        const model_details_resp = await this.http_adapter.request({
          url: `http://localhost:11434/api/show`,
          method: 'POST',
          body: JSON.stringify({model: model.name}),
        });
        console.log('model_details_response', model_details_resp);
        const model_details_data = await model_details_resp.json();
        console.log('model_details_data', model_details_data);
        models_raw_data.push({...model_details_data, name: model.name});
      }
      const model_data = this.parse_model_data(models_raw_data);
      console.log('model_data', model_data);
      this.adapter_settings.models = model_data; // set to adapter_settings to persist
      this.model.render_settings(); // re-render settings to update models dropdown
      return model_data;

    } catch (error) {
      console.error('Failed to fetch model data:', error);
      return {"_": {id: `Failed to fetch models from ${this.model.adapter_name}`}};
    }
  }

  /**
   * Parse model data from Ollama API response
   * @param {Object[]} model_data - Raw model data from Ollama
   * @returns {Object} Map of model objects with capabilities and limits
   */
  parse_model_data(model_data) {
    return model_data
      .reduce((acc, model) => {
        const out = {
          model_name: model.name,
          id: model.name,
          multimodal: false,
          max_input_tokens: Object.entries(model.model_info).find(m => m[0].includes('.context_length'))[1],
        };
        acc[model.name] = out;
        return acc;
      }, {})
    ;
  }

  /**
   * Override settings config to remove API key setting since not needed for local instance
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    const config = super.settings_config;
    delete config['[CHAT_ADAPTER].api_key'];
    return config;
  }
  is_end_of_stream(event) {
    return event.data.includes('"done_reason"');
  }
}

export class SmartChatModelOllamaRequestAdapter extends SmartChatModelRequestAdapter {
  /**
   * Convert request to Ollama format
   * @returns {Object} Request parameters in Ollama format
   */
  to_platform(streaming = false) {
    const ollama_body = {
      model: this.model,
      messages: this._transform_messages_to_ollama(),
      options: this._transform_parameters_to_ollama(),
      stream: streaming || this.stream,
      // format: 'json', // only used for tool calls since returns JSON in content body
    };

    if (this.tools) {
      ollama_body.tools = this._transform_functions_to_tools();
      if(this.tool_choice?.function?.name){
        ollama_body.messages[ollama_body.messages.length - 1].content += `\n\nUse the "${this.tool_choice.function.name}" tool.`;
        ollama_body.format = 'json';
      }
    }

    return {
      url: this.adapter.endpoint,
      method: 'POST',
      body: JSON.stringify(ollama_body)
    };
  }

  /**
   * Transform messages to Ollama format
   * @returns {Array} Messages in Ollama format
   * @private
   */
  _transform_messages_to_ollama() {
    return this.messages.map(message => {
      const ollama_message = {
        role: message.role,
        content: this._transform_content_to_ollama(message.content)
      };

      // Extract images if present
      const images = this._extract_images_from_content(message.content);
      if (images.length > 0) {
        ollama_message.images = images;
      }

      return ollama_message;
    });
  }

  /**
   * Transform content to Ollama format
   * @param {string|Array} content - Message content
   * @returns {string} Content in Ollama format
   * @private
   */
  _transform_content_to_ollama(content) {
    if (Array.isArray(content)) {
      return content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }
    return content;
  }

  /**
   * Extract images from content
   * @param {string|Array} content - Message content
   * @returns {Array} Array of image URLs
   * @private
   */
  _extract_images_from_content(content) {
    if (!Array.isArray(content)) return [];
    return content
      .filter(item => item.type === 'image_url')
      .map(item => item.image_url.url);
  }

  /**
   * Transform functions to tools format
   * @returns {Array} Tools array in Ollama format
   * @private
   */
  _transform_functions_to_tools() {
    return this.tools;
  }

  /**
   * Transform parameters to Ollama options format
   * @returns {Object} Options in Ollama format
   * @private
   */
  _transform_parameters_to_ollama() {
    const options = {};
    
    if (this.max_tokens) options.num_predict = this.max_tokens;
    if (this.temperature) options.temperature = this.temperature;
    if (this.top_p) options.top_p = this.top_p;
    if (this.frequency_penalty) options.frequency_penalty = this.frequency_penalty;
    if (this.presence_penalty) options.presence_penalty = this.presence_penalty;
    
    return options;
  }
}

/**
 * Response adapter for Ollama API
 * @class SmartChatModelOllamaResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
export class SmartChatModelOllamaResponseAdapter extends SmartChatModelResponseAdapter {
  static get platform_res() {
    return {
      model: '',
      created_at: null,
      message: {
        role: '',
        content: ''
      },
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0
    };
  }
  /**
   * Convert response to OpenAI format
   * @returns {Object} Response in OpenAI format
   */
  to_openai() {
    return {
      id: this._res.created_at,
      object: 'chat.completion',
      created: Date.now(),
      model: this._res.model,
      choices: [
        {
          index: 0,
          message: this._transform_message_to_openai(),
          finish_reason: this._res.done_reason
        }
      ],
      usage: this._transform_usage_to_openai()
    };
  }

  /**
   * Transform message to OpenAI format
   * @returns {Object} Message in OpenAI format
   * @private
   */
  _transform_message_to_openai() {
    return {
      role: this._res.message.role,
      content: this._res.message.content,
      tool_calls: this._res.message.tool_calls
    };
  }

  /**
   * Transform usage statistics to OpenAI format
   * @returns {Object} Usage statistics in OpenAI format
   * @private
   */
  _transform_usage_to_openai() {
    return {
      prompt_tokens: this._res.prompt_eval_count || 0,
      completion_tokens: this._res.eval_count || 0,
      total_tokens: (this._res.prompt_eval_count || 0) + (this._res.eval_count || 0)
    };
  }
  /**
   * Parse chunk adds delta to content as expected output format
   */
  handle_chunk(chunk) {
    chunk = JSON.parse(chunk || '{}');
    if(chunk.created_at && !this._res.created_at){
      this._res.created_at = chunk.created_at;
    }
    if(chunk.message?.content){
      this._res.message.content += chunk.message.content;
    }
    if(chunk.message?.role){
      this._res.message.role = chunk.message.role;
    }
    if(chunk.model){
      this._res.model = chunk.model;
    }
    if(chunk.message?.tool_calls){
      if(!this._res.message.tool_calls){
        this._res.message.tool_calls = [{
          id: '',
          type: 'function',
          function: {
            name: '',
            arguments: '',
          },
        }];
      }
      if(chunk.message.tool_calls[0].id){
        this._res.message.tool_calls[0].id += chunk.message.tool_calls[0].id;
      }
      if(chunk.message.tool_calls[0].function.name){
        this._res.message.tool_calls[0].function.name += chunk.message.tool_calls[0].function.name;
      }
      if(chunk.message.tool_calls[0].function.arguments){
        this._res.message.tool_calls[0].function.arguments += chunk.message.tool_calls[0].function.arguments;
      }
    }
  }
}


