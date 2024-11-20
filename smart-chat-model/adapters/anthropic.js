import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

/**
 * Adapter for Anthropic's Claude API.
 * Handles API communication and message formatting for Claude models.
 * @class SmartChatModelAnthropicAdapter
 * @extends SmartChatModelApiAdapter
 * 
 * @property {Object} static defaults - Default configuration for Anthropic adapter
 * @property {string} defaults.description - Human-readable description
 * @property {string} defaults.type - Adapter type ("API")
 * @property {string} defaults.endpoint - Anthropic API endpoint
 * @property {boolean} defaults.streaming - Whether streaming is supported
 * @property {string} defaults.api_key_header - Custom header for API key
 * @property {Object} defaults.headers - Additional required headers
 * @property {boolean} defaults.actions - Whether function calling is supported
 * @property {boolean} defaults.models_endpoint - Whether models endpoint is available
 * @property {string} defaults.default_model - Default model to use
 * @property {string} defaults.signup_url - URL for API key signup
 */
export class SmartChatModelAnthropicAdapter extends SmartChatModelApiAdapter {
  static defaults = {
    description: "Anthropic Claude",
    type: "API",
    endpoint: "https://api.anthropic.com/v1/messages",
    streaming: false,
    api_key_header: "x-api-key",
    headers: {
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "tools-2024-04-04"
    },
    adapter: "Anthropic",
    actions: true,
    models_endpoint: false,
    default_model: "claude-3-5-sonnet-latest",
    signup_url: "https://console.anthropic.com/login?returnTo=%2Fsettings%2Fkeys"
  };

  /**
   * Get request adapter class
   * @returns {typeof SmartChatModelAnthropicRequestAdapter} Request adapter class
   */
  get req_adapter() { return SmartChatModelAnthropicRequestAdapter; }

  /**
   * Get response adapter class
   * @returns {typeof SmartChatModelAnthropicResponseAdapter} Response adapter class
   */
  get res_adapter() { return SmartChatModelAnthropicResponseAdapter; }

  /**
   * Validate parameters for getting models
   * @returns {boolean} Always true since models are hardcoded
   */
  validate_get_models_params() {
    return true;
  }

  /**
   * Get available models (hardcoded list)
   * @returns {Promise<Object>} Map of model objects
   */
  get_models() {
    return Promise.resolve(this.models);
  }

  /**
   * Get hardcoded list of available models
   * @returns {Object} Map of model objects with capabilities and limits
   */
  get models() {
    return {
      "claude-3-5-sonnet-latest": {
        id: "claude-3-5-sonnet-latest",
        model_name: "claude-3.5-sonnet-latest",
        description: "Anthropic's Claude Sonnet (Latest)",
        max_input_tokens: 200000,
        max_output_tokens: 4000,
        multimodal: true
      },
      "claude-3-opus-20240229": {
        id: "claude-3-opus-20240229",
        model_name: "claude-3-opus-20240229",
        description: "Anthropic's Claude Opus",
        max_input_tokens: 200000,
        max_output_tokens: 4000,
        multimodal: true
      },
      "claude-3-haiku-20240307": {
        id: "claude-3-haiku-20240307",
        model_name: "claude-3-haiku-20240307",
        description: "Anthropic's Claude Haiku (2024-03-07)",
        max_input_tokens: 200000,
        max_output_tokens: 4000,
        multimodal: true
      },
      "claude-3-5-sonnet-20241022": {
        id: "claude-3.5-sonnet-20241022",
        model_name: "claude-3.5-sonnet-20241022",
        description: "Anthropic's Claude Sonnet (2024-10-22)",
        max_input_tokens: 200000,
        max_output_tokens: 4000,
        multimodal: true
      },
      "claude-3-5-sonnet-20240620": {
        id: "claude-3.5-sonnet-20240620",
        model_name: "claude-3.5-sonnet-20240620",
        description: "Anthropic's Claude Sonnet (2024-06-20)",
        max_input_tokens: 200000,
        max_output_tokens: 4000,
        multimodal: true
      },
      "claude-3-sonnet-20240229": {
        id: "claude-3-sonnet-20240229",
        model_name: "claude-3-sonnet-20240229",
        description: "Anthropic's Claude Sonnet",
        max_input_tokens: 200000,
        max_output_tokens: 4000,
        multimodal: true
      },
    };
  }
}

/**
 * Request adapter for Anthropic API
 * @class SmartChatModelAnthropicRequestAdapter
 * @extends SmartChatModelRequestAdapter
 */
export class SmartChatModelAnthropicRequestAdapter extends SmartChatModelRequestAdapter {
  /**
   * Convert request to Anthropic format
   * @returns {Object} Request parameters in Anthropic format
   */
  to_platform() { return this.to_anthropic(); }

  /**
   * Convert request to Anthropic format
   * @returns {Object} Request parameters in Anthropic format
   */
  to_anthropic() {
    this.anthropic_body = {
      model: this.model,
      messages: this._transform_messages_to_anthropic(),
      max_tokens: this.max_tokens,
      temperature: this.temperature,
      stream: this.stream
    };

    if (this.tools) {
      this.anthropic_body.tools = this._transform_tools_to_anthropic();
    }

    if (this.tool_choice) {
      if (this.tool_choice === 'auto') {
        this.anthropic_body.tool_choice = { type: 'auto' };
      } else if (typeof this.tool_choice === 'object' && this.tool_choice.function) {
        this.anthropic_body.tool_choice = { type: 'tool', name: this.tool_choice.function.name };
      }
    }

    return {
      url: this.adapter.endpoint,
      method: 'POST',
      headers: this.get_headers(),
      body: JSON.stringify(this.anthropic_body)
    };
  }

  /**
   * Transform messages to Anthropic format
   * @returns {Array<Object>} Messages in Anthropic format
   * @private
   */
  _transform_messages_to_anthropic() {
    let anthropic_messages = [];

    for (const message of this.messages) {
      if (message.role === 'system') {
        if(!this.anthropic_body.system) this.anthropic_body.system = '';
        else this.anthropic_body.system += '\n\n';
        this.anthropic_body.system += message.content;
      } else {
        anthropic_messages.push({
          role: this._get_anthropic_role(message.role),
          content: this._get_anthropic_content(message.content)
        });
      }
    }

    return anthropic_messages;
  }

  /**
   * Transform role to Anthropic format
   * @param {string} role - Original role
   * @returns {string} Role in Anthropic format
   * @private
   */
  _get_anthropic_role(role) {
    const role_map = {
      function: 'assistant' // Anthropic doesn't have a function role, so we'll treat it as assistant
    };
    return role_map[role] || role;
  }

  /**
   * Transform content to Anthropic format
   * @param {string|Array} content - Original content
   * @returns {string|Array} Content in Anthropic format
   * @private
   */
  _get_anthropic_content(content) {
    if (Array.isArray(content)) {
      return content.map(item => {
        if (item.type === 'text') return { type: 'text', text: item.text };
        if (item.type === 'image_url') {
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: item.image_url.url.split(';')[0].split(':')[1],
              data: item.image_url.url.split(',')[1]
            }
          };
        }
        return item;
      });
    }
    return content;
  }

  /**
   * Transform tools to Anthropic format
   * @returns {Array<Object>} Tools in Anthropic format
   * @private
   */
  _transform_tools_to_anthropic() {
    if (!this.tools) return undefined;
    return this.tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }));
  }
}

/**
 * Response adapter for Anthropic API
 * @class SmartChatModelAnthropicResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
export class SmartChatModelAnthropicResponseAdapter extends SmartChatModelResponseAdapter {
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
          finish_reason: this._get_openai_finish_reason(this._res.stop_reason)
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
    const message = {
      role: 'assistant',
      content: '',
      tool_calls: []
    };

    if (Array.isArray(this._res.content)) {
      for (const content of this._res.content) {
        if (content.type === 'text') {
          message.content += (message.content ? '\n\n' : '') + content.text;
        } else if (content.type === 'tool_use') {
          message.tool_calls.push({
            id: content.tool_use.id,
            type: 'function',
            function: {
              name: content.tool_use.name,
              arguments: JSON.stringify(content.tool_use.input)
            }
          });
        }
      }
    } else {
      message.content = this._res.content;
    }

    if (message.tool_calls.length === 0) {
      delete message.tool_calls;
    }

    return message;
  }

  /**
   * Transform finish reason to OpenAI format
   * @param {string} stop_reason - Original finish reason
   * @returns {string} Finish reason in OpenAI format
   * @private
   */
  _get_openai_finish_reason(stop_reason) {
    const reason_map = {
      'end_turn': 'stop',
      'max_tokens': 'length',
      'tool_use': 'function_call'
    };
    return reason_map[stop_reason] || stop_reason;
  }

  /**
   * Transform usage statistics to OpenAI format
   * @returns {Object} Usage statistics in OpenAI format
   * @private
   */
  _transform_usage_to_openai() {
    if (!this._res.usage) {
      return {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };
    }
    return {
      prompt_tokens: this._res.usage.input_tokens || 0,
      completion_tokens: this._res.usage.output_tokens || 0,
      total_tokens: (this._res.usage.input_tokens || 0) + (this._res.usage.output_tokens || 0)
    };
  }
}


