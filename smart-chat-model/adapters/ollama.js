import { SmartChatModelApiAdapter, SmartChatModelResponseAdapter } from "./_api.js";

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
    streaming: false, // TODO: Implement streaming
  }

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
}

/**
 * Response adapter for Ollama API
 * @class SmartChatModelOllamaResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
export class SmartChatModelOllamaResponseAdapter extends SmartChatModelResponseAdapter {
  /**
   * Convert response to OpenAI format
   * @returns {Object} Response in OpenAI format
   */
  to_openai() {
    return {
      id: this._res.id,
      object: 'chat.completion',
      created: Date.now(),
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
      content: this._res.message.content
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
}


