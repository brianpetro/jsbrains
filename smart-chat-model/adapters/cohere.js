import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter, SmartChatModelResponseAdapter } from './_api.js';

export class SmartChatModelCohereAdapter extends SmartChatModelApiAdapter {
  static defaults = {
    description: "Cohere Command-R",
    type: "API",
    endpoint: "https://api.cohere.ai/v1/chat",
    streaming: false,
    adapter: "Cohere",
    models_endpoint: "https://api.cohere.ai/v1/models",
    default_model: "command-r",
    signup_url: "https://dashboard.cohere.com/welcome/register?redirect_uri=%2Fapi-keys"
  };

  get req_adapter() { return SmartChatModelCohereRequestAdapter; }
  get res_adapter() { return SmartChatModelCohereResponseAdapter; }

  async count_tokens(input) {
    const req = {
      url: `${this.endpoint}/tokenize`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.api_key}`
      },
      body: JSON.stringify({ text: typeof input === 'string' ? input : JSON.stringify(input) })
    };
    const resp = await this.http_adapter.request(req);
    return resp.json.tokens.length;
  }

  parse_model_data(model_data) {
    return model_data.models
      .filter(model => model.name.startsWith('command-'))
      .reduce((acc, model) => {
        acc[model.name] = {
          model_name: model.name,
          id: model.name,
          max_input_tokens: model.context_length,
          tokenizer_url: model.tokenizer_url,
          finetuned: model.finetuned,
          description: `Max input tokens: ${model.context_length}, Finetuned: ${model.finetuned}`,
          raw: model
        };
        return acc;
      }, {})
    ;
  }
}

export class SmartChatModelCohereRequestAdapter extends SmartChatModelRequestAdapter {
  to_platform() { return this.to_cohere(); }

  to_cohere() {
    const cohere_body = {
      model: this.model,
      message: this._get_latest_user_message(),
      chat_history: this._transform_messages_to_cohere_chat_history(),
      max_tokens: this.max_tokens,
      temperature: this.temperature,
      stream: this.stream,
      ...(this.tools && { tools: this._transform_tools_to_cohere() }),
      ...(this._req.tool_choice && { tool_choice: this._req.tool_choice }),
      ...(this._req.preamble && { preamble: this._req.preamble }),
      ...(this._req.conversation_id && { conversation_id: this._req.conversation_id }),
      ...(this._req.connectors && { connectors: this._req.connectors }),
      ...(this._req.documents && { documents: this._req.documents }),
    };

    if (this._req.response_format) {
      cohere_body.response_format = {
        type: this._req.response_format.type,
        ...(this._req.response_format.schema && { schema: this._req.response_format.schema })
      };
    }

    return {
      url: this.adapter.endpoint,
      method: 'POST',
      headers: this.get_headers(),
      body: JSON.stringify(cohere_body)
    };
  }

  _get_latest_user_message() {
    // throw if image input
    if (this.messages.some(msg => Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url'))) {
      throw new Error("Cohere API does not support image input");
    }
    const user_messages = this.messages.filter(msg => msg.role === 'user');
    return user_messages[user_messages.length - 1]?.content || '';
  }

  _transform_messages_to_cohere_chat_history() {
    return this.messages.slice(0, -1).map(message => ({
      role: this._get_cohere_role(message.role),
      message: this._get_cohere_content(message.content)
    }));
  }

  _get_cohere_role(role) {
    const role_map = {
      system: 'SYSTEM',
      user: 'USER',
      assistant: 'CHATBOT',
      function: 'CHATBOT'
    };
    return role_map[role] || role.toUpperCase();
  }

  _get_cohere_content(content) {
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'image_url') {
          throw new Error("Cohere API does not support image input");
        }
      }
      return content.map(part => {
        if (part.type === 'text') return part.text;
        return JSON.stringify(part);
      }).join('\n');
    }
    return content;
  }

  _transform_tools_to_cohere() {
    return this.tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }));
  }
}

export class SmartChatModelCohereResponseAdapter extends SmartChatModelResponseAdapter {
  to_openai() {
    if (this._res.message) {
      throw new Error(this._res.message);
    }

    return {
      id: this._res.generation_id || 'cohere_' + Date.now(),
      object: 'chat.completion',
      created: Date.now(),
      model: this.adapter.model_key,
      choices: [
        {
          index: 0,
          message: this._transform_message_to_openai(),
          finish_reason: this._get_openai_finish_reason(this._res.finish_reason)
        }
      ],
      usage: this._transform_usage_to_openai()
    };
  }

  _transform_message_to_openai() {
    const message = {
      role: 'assistant',
      content: this._res.text || ''
    };

    if (this._res.citations) {
      message.citations = this._res.citations;
    }

    if (this._res.documents) {
      message.documents = this._res.documents;
    }

    if (this._res.search_queries) {
      message.search_queries = this._res.search_queries;
    }

    if (this._res.search_results) {
      message.search_results = this._res.search_results;
    }

    return message;
  }

  _get_openai_finish_reason(finish_reason) {
    const reason_map = {
      'COMPLETE': 'stop',
      'MAX_TOKENS': 'length',
      'ERROR': 'error',
      'STOP_SEQUENCE': 'stop'
    };
    return reason_map[finish_reason] || 'stop';
  }

  _transform_usage_to_openai() {
    if (!this._res.meta || !this._res.meta.billed_units) {
      return {
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null
      };
    }
    return {
      prompt_tokens: this._res.meta.billed_units.input_tokens || null,
      completion_tokens: this._res.meta.billed_units.output_tokens || null,
      total_tokens: (this._res.meta.billed_units.input_tokens || 0) + (this._res.meta.billed_units.output_tokens || 0)
    };
  }
}