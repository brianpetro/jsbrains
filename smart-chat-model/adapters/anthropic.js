import {
  SmartChatModelApiAdapter,
  SmartChatModelRequestAdapter,
  SmartChatModelResponseAdapter
} from './_api.js';
import { normalize_error } from 'smart-utils/normalize_error.js';

/**
 * Adapter for Anthropic's Claude API.
 * Handles API communication and message formatting for Claude models.
 *
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
  static key = 'anthropic';

  static defaults = {
    description: 'Anthropic Claude',
    type: 'API',
    endpoint: 'https://api.anthropic.com/v1/messages',
    streaming: true,
    api_key_header: 'x-api-key',
    headers: {
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'tools-2024-04-04',
      'anthropic-dangerous-direct-browser-access': true
    },
    adapter: 'Anthropic',
    models_endpoint: false,
    default_model: 'claude-opus-4-1-20250805',
    signup_url: 'https://console.anthropic.com/login?returnTo=%2Fsettings%2Fkeys',
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
  res_adapter = SmartChatModelAnthropicResponseAdapter;

  /**
   * Get available models (hardcoded list) and enrich via models.dev
   * @returns {Promise<Object>} Map of model objects
   */
  async get_models() {
    try {
      // this.model_data = this.anthropic_models; // do not set: prevents importing additional models
      this.model_data = await this.get_enriched_model_data();
      this.model_data_loaded_at = Date.now();
      this.model.data.provider_models = this.model_data;
      setTimeout(() => {
        this.model.re_render_settings();
      }, 100);
      return this.model_data;
    } catch {
      return this.anthropic_models; // fallback
    }
  }

  is_end_of_stream(event) {
    return event.data.includes('message_stop');
  }

  /**
   * Get hardcoded list of available models
   * @deprecated use get_enriched_model_data() instead (remove after no-incidents)
   * @returns {Object} Map of model objects with capabilities and limits
   */
  get anthropic_models() {
    return {
      // ── Claude 4 family ──────────────────────────────────────────────────────

      'claude-opus-4-1-20250805': {
        name: 'Claude Opus 4.1 (2025-08-05)',
        id: 'claude-opus-4-1-20250805',
        model_name: 'claude-opus-4-1-20250805',
        description: 'Anthropic Claude Opus 4.1 snapshot (2025-08-05)',
        max_input_tokens: 200_000,
        max_output_tokens: 32_000,
        multimodal: true
      },

      'claude-opus-4-20250514': {
        name: 'Claude Opus 4 (2025-05-14)',
        id: 'claude-opus-4-20250514',
        model_name: 'claude-opus-4-20250514',
        description: 'Anthropic Claude Opus 4 snapshot (2025-05-14)',
        max_input_tokens: 200_000,
        max_output_tokens: 32_000,
        multimodal: true
      },

      'claude-sonnet-4-20250514': {
        name: 'Claude Sonnet 4 (2025-05-14)',
        id: 'claude-sonnet-4-20250514',
        model_name: 'claude-sonnet-4-20250514',
        description: 'Anthropic Claude Sonnet 4 snapshot (2025-05-14)',
        max_input_tokens: 200_000,
        max_output_tokens: 64_000,
        multimodal: true
      },

      // ── Claude 3.7 family ───────────────────────────────────────────────────

      'claude-3-7-sonnet-latest': {
        name: 'Claude 3.7 Sonnet (latest)',
        id: 'claude-3-7-sonnet-latest',
        model_name: 'claude-3-7-sonnet-latest',
        description: 'Anthropic Claude 3.7 Sonnet (rolling-latest)',
        max_input_tokens: 200_000,
        max_output_tokens: 64_000,
        multimodal: true
      },

      'claude-3-7-sonnet-20250219': {
        name: 'Claude 3.7 Sonnet (2025-02-19)',
        id: 'claude-3-7-sonnet-20250219',
        model_name: 'claude-3-7-sonnet-20250219',
        description: 'Anthropic Claude 3.7 Sonnet snapshot (2025-02-19)',
        max_input_tokens: 200_000,
        max_output_tokens: 64_000,
        multimodal: true
      },

      // ── Claude 3.5 family ───────────────────────────────────────────────────

      'claude-3-5-sonnet-latest': {
        name: 'Claude 3.5 Sonnet (latest)',
        id: 'claude-3-5-sonnet-latest',
        model_name: 'claude-3-5-sonnet-latest',
        description: 'Anthropic Claude 3.5 Sonnet (rolling-latest)',
        max_input_tokens: 200_000,
        max_output_tokens: 8_192,
        multimodal: true
      },

      'claude-3-5-sonnet-20241022': {
        name: 'Claude 3.5 Sonnet (2024-10-22)',
        id: 'claude-3-5-sonnet-20241022',
        model_name: 'claude-3-5-sonnet-20241022',
        description: 'Anthropic Claude 3.5 Sonnet snapshot (2024-10-22)',
        max_input_tokens: 200_000,
        max_output_tokens: 8_192,
        multimodal: true
      },

      'claude-3-5-haiku-latest': {
        name: 'Claude 3.5 Haiku (latest)',
        id: 'claude-3-5-haiku-latest',
        model_name: 'claude-3-5-haiku-latest',
        description: 'Anthropic Claude 3.5 Haiku (rolling-latest)',
        max_input_tokens: 200_000,
        max_output_tokens: 8_192
      },

      'claude-3-5-haiku-20241022': {
        name: 'Claude 3.5 Haiku (2024-10-22)',
        id: 'claude-3-5-haiku-20241022',
        model_name: 'claude-3-5-haiku-20241022',
        description: 'Anthropic Claude 3.5 Haiku snapshot (2024-10-22)',
        max_input_tokens: 200_000,
        max_output_tokens: 8_192
      },

      // ── Claude 3 family ─────────────────────────────────────────────────────

      'claude-3-opus-latest': {
        name: 'Claude 3 Opus (latest)',
        id: 'claude-3-opus-latest',
        model_name: 'claude-3-opus-latest',
        description: 'Anthropic Claude 3 Opus (rolling-latest)',
        max_input_tokens: 200_000,
        max_output_tokens: 4_096,
        multimodal: true
      },

      'claude-3-opus-20240229': {
        name: 'Claude 3 Opus (2024-02-29)',
        id: 'claude-3-opus-20240229',
        model_name: 'claude-3-opus-20240229',
        description: 'Anthropic Claude 3 Opus snapshot (2024-02-29)',
        max_input_tokens: 200_000,
        max_output_tokens: 4_096,
        multimodal: true
      },

      'claude-3-sonnet-20240229': {
        name: 'Claude 3 Sonnet (2024-02-29)',
        id: 'claude-3-sonnet-20240229',
        model_name: 'claude-3-sonnet-20240229',
        description: 'Anthropic Claude 3 Sonnet snapshot (2024-02-29)',
        max_input_tokens: 200_000,
        max_output_tokens: 4_096,
        multimodal: true
      },

      'claude-3-haiku-20240307': {
        name: 'Claude 3 Haiku (2024-03-07)',
        id: 'claude-3-haiku-20240307',
        model_name: 'claude-3-haiku-20240307',
        description: 'Anthropic Claude 3 Haiku snapshot (2024-03-07)',
        max_input_tokens: 200_000,
        max_output_tokens: 4_096,
        multimodal: true
      }
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
  to_platform(streaming = false) { return this.to_anthropic(streaming); }

  /**
   * Convert request to Anthropic format
   * @returns {Object} Request parameters in Anthropic format
   */
  to_anthropic(streaming = false) {
    this.anthropic_body = {
      model: this.model_id,
      max_tokens: this.max_tokens,
      temperature: this.temperature,
      stream: streaming,
    };

    /* system / user / assistant / tool messages -------------------------------- */
    this.anthropic_body.messages = this._transform_messages_to_anthropic();

    /* optional tool integration ------------------------------------------------ */
    if (this.tools) {
      this.anthropic_body.tools = this._transform_tools_to_anthropic();
    }
    if (this.tool_choice) {
      this.anthropic_body.tool_choice =
        this.tool_choice === 'auto'
          ? { type: 'auto' }
          : { type: 'tool', name: this.tool_choice.function.name };
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
        this.anthropic_body.system += Array.isArray(message.content) ? message.content.map(part => part.text).join('\n') : message.content;
      } else if (message.role === 'tool') {
        const msg = {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: message.tool_call_id,
              content: message.content
            }
          ]
        };
        anthropic_messages.push(msg);
      } else {
        const msg = {
          role: this._get_anthropic_role(message.role),
          content: this._get_anthropic_content(message.content)
      };
        if(message.tool_calls?.length > 0) msg.content = this._transform_tool_calls_to_content(message.tool_calls);
        anthropic_messages.push(msg);
      }
    }

    return anthropic_messages;
  }

  /**
   * Transform tool calls to Anthropic format
   * @param {Array<Object>} tool_calls - Tool calls
   * @returns {Array<Object>} Tool calls in Anthropic format
   * @private
   */
  _transform_tool_calls_to_content(tool_calls) {
    return tool_calls.map(tool_call => ({
      type: 'tool_use',
      id: tool_call.id,
      name: tool_call.function.name,
      input: JSON.parse(tool_call.function.arguments)
    }));
  }


  /**
   * Transform role to Anthropic format
   * @param {string} role - Original role
   * @returns {string} Role in Anthropic format
   * @private
   */
  _get_anthropic_role(role) {
    const role_map = {
      function: 'assistant', // Anthropic doesn't have a function role, so we'll treat it as assistant
      tool: 'user'
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

        if (item.type === 'file' && item.file?.filename?.toLowerCase().endsWith('.pdf')) {
          if (item.file?.file_data) {
            return {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: item.file.file_data.split(',')[1]
              }
            };
          }
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
      input_schema: tool.function.parameters
    }));
  }
}

/**
 * Response adapter for Anthropic API
 * @class SmartChatModelAnthropicResponseAdapter
 * @extends SmartChatModelResponseAdapter
 */
export class SmartChatModelAnthropicResponseAdapter extends SmartChatModelResponseAdapter {
  static get platform_res() {
    return {
      content: [],
      id: "",
      model: "",
      role: "assistant",
      stop_reason: null,
      stop_sequence: null,
      type: "message",
      usage: {
        input_tokens: 0,
        output_tokens: 0
      }
    };
  }
  /**
   * Convert response to OpenAI format
   * @returns {Object} Response in OpenAI format
   */
  to_openai() {
    if(this.error) return { error: normalize_error(this.error, this.status) };
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
            id: content.id,
            type: 'function',
            function: {
              name: content.name,
              arguments: JSON.stringify(content.input)
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


  handle_chunk(chunk) {
    if(!chunk.startsWith('data: ')) return;
    chunk = JSON.parse(chunk.slice(6));
    // Initialize response structure if needed
    if (!this._res.content.length) {
      this._res.content = [
        {
          type: 'text',
          text: ''
        }
      ];
    }

    if(chunk.message?.id) {
      this._res.id = chunk.message.id;
    }
    if(chunk.message?.model) {
      this._res.model = chunk.message.model;
    }
    if(chunk.message?.role) {
      this._res.role = chunk.message.role;
    }
    let raw;
    if(chunk.delta?.type === 'text_delta') {
      const content = chunk.delta?.text;
      raw = content;
      this._res.content[0].text += content;
    }
    if(chunk.delta?.stop_reason) {
      this._res.stop_reason = chunk.delta.stop_reason;
    }
    if(chunk.usage) {
      this._res.usage = {
        ...this._res.usage,
        ...chunk.usage
      };
    }
    return raw;
  }
}