import { SmartChatModelApiAdapter } from "./_api.js";

export class SmartChatModelOpenaiAdapter extends SmartChatModelApiAdapter {
  parse_model_data(model_data) {
    return model_data.data
      .filter(model => model.id.startsWith('gpt-') && !model.id.includes('-instruct'))
      .map(model => {
        const out = {
          model_name: model.id,
          key: model.id,
          multimodal: model.id.includes('vision') || model.id.includes('gpt-4-turbo') || model.id.startsWith('gpt-4o')
        };
        const m = Object.entries(model_context).find(m => m[0] === model.id || model.id.startsWith(m[0] + '-'));
        if (m) {
          out.max_input_tokens = m[1].context;
          out.description = `context: ${m[1].context}, output: ${m[1].max_out}`;
        }
        return out;
      })
      .sort((a, b) => a.model_name.localeCompare(b.model_name))
    ;
  }
  get models_endpoint_method() { return 'GET'; }
  async test_api_key() {
    const models = await this.get_models();
    return models.length > 0;
  }
  get settings_config() {
    return {
      "[CHAT_PLATFORM].high_image_resolution": {
        name: 'High Resolution Images',
        type: "toggle",
        description: "Enable high resolution images for the chat model (this will increase costs).",
        default: false,
        conditional: (_this) => _this.adapter?.model_config?.multimodal,
      },
    };
  }
}
// Manual model context for now since OpenAI doesn't provide this info in the API response
// may require updating when new models are released
const model_context = {
  "gpt-3.5-turbo-0125": {
    "context": 16385,
    "max_out": 4096
  },
  "gpt-3.5-turbo-0301": {
    "context": 4097,
    "max_out": 4097
  },
  "gpt-3.5-turbo-0613": {
    "context": 4097,
    "max_out": 4097
  },
  "gpt-3.5-turbo-1106": {
    "context": 16385,
    "max_out": 4096
  },
  "gpt-3.5-turbo-16k": {
    "context": 16385,
    "max_out": 16385
  },
  "gpt-3.5-turbo-16k-0613": {
    "context": 16385,
    "max_out": 16385
  },
  "gpt-4-0125-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-0314": {
    "context": 8192,
    "max_out": 8192
  },
  "gpt-4-0613": {
    "context": 8192,
    "max_out": 8192
  },
  "gpt-4-1106-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-1106-vision-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-32k-0314": {
    "context": 32768,
    "max_out": 32768
  },
  "gpt-4-32k-0613": {
    "context": 32768,
    "max_out": 32768
  },
  "gpt-4-turbo-2024-04-09": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-turbo-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-vision-preview": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-3.5-turbo": {
    "context": 16385,
    "max_out": 4096
  },
  "gpt-4-turbo": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4-32k": {
    "context": 32768,
    "max_out": 32768
  },
  "gpt-4o": {
    "context": 128000,
    "max_out": 4096
  },
  "gpt-4": {
    "context": 8192,
    "max_out": 8192
  }
};

  
