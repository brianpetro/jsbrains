import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

export class SmartChatModelAnthropicAdapter extends SmartChatModelApiAdapter {
  get res_adapter() { return SmartChatModelAnthropicResponseAdapter; }
  get req_adapter() { return SmartChatModelAnthropicRequestAdapter; }
  // Implement Anthropic-specific methods here
  async get_models() {
    return [
      {
        key: "claude-3-5-sonnet-latest",
        "model_name": "claude-3.5-sonnet-latest",
        "description": "Anthropic's Claude Sonnet (Latest)",
        "max_input_tokens": 200000,
        "max_output_tokens": 4000,
        "multimodal": true
      },
      {
        "key": "claude-3-opus-20240229",
        "model_name": "claude-3-opus-20240229",
        "description": "Anthropic's Claude Opus",
        "max_input_tokens": 200000,
        "max_output_tokens": 4000,
        "multimodal": true
      },
      {
        key: "claude-3-haiku-20240307",
        "model_name": "claude-3-haiku-20240307",
        "description": "Anthropic's Claude Haiku (2024-03-07)",
        "max_input_tokens": 200000,
        "max_output_tokens": 4000,
        "multimodal": true
      },
      {
        key: "claude-3-5-sonnet-20241022",
        "model_name": "claude-3.5-sonnet-20241022",
        "description": "Anthropic's Claude Sonnet (2024-10-22)",
        "max_input_tokens": 200000,
        "max_output_tokens": 4000,
        "multimodal": true
      },
      {
        key: "claude-3-5-sonnet-20240620",
        "model_name": "claude-3.5-sonnet-20240620",
        "description": "Anthropic's Claude Sonnet (2024-06-20)",
        "max_input_tokens": 200000,
        "max_output_tokens": 4000,
        "multimodal": true
      },
      {
        key: "claude-3-sonnet-20240229",
        "model_name": "claude-3-sonnet-20240229",
        "description": "Anthropic's Claude Sonnet",
        "max_input_tokens": 200000,
        "max_output_tokens": 4000,
        "multimodal": true
      },
    ];
  }
}

export class SmartChatModelAnthropicRequestAdapter extends SmartChatModelRequestAdapter {

  to_platform() { return this.to_anthropic(); }

  to_anthropic() {
    this.anthropic_body = {};
    this.anthropic_body.model = this.model;
    this.anthropic_body.messages = this._transform_messages_to_anthropic();
    this.anthropic_body.max_tokens = this.max_tokens;
    this.anthropic_body.temperature = this.temperature;
    this.anthropic_body.stream = this.stream;
    if (this.tools) this.anthropic_body.tools = this._transform_tools_to_anthropic();
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

  _get_anthropic_role(role) {
    const role_map = {
      function: 'assistant' // Anthropic doesn't have a function role, so we'll treat it as assistant
    };
    return role_map[role] || role;
  }

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

  _transform_tools_to_anthropic() {
    if (!this.tools) return undefined;
    return this.tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }));
  }
}

export class SmartChatModelAnthropicResponseAdapter extends SmartChatModelResponseAdapter {
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

  _get_openai_finish_reason(stop_reason) {
    const reason_map = {
      'end_turn': 'stop',
      'max_tokens': 'length',
      'tool_use': 'function_call'
    };
    return reason_map[stop_reason] || stop_reason;
  }

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


