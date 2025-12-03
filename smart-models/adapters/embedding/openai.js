import {
  SmartEmbedOpenAIAdapter,
} from "smart-embed-model/adapters/openai.js";

export class OpenAIEmbeddingModelAdapter extends SmartEmbedOpenAIAdapter {
  constructor(model_item) {
    super(model_item);
  }

  get http_adapter() {
    if (!this._http_adapter) {
      const HttpClass = this.model.env.config.modules.http_adapter.class;
      const http_params = {...this.model.env.config.modules.http_adapter, class: undefined};
      this._http_adapter = new HttpClass(http_params);
    }
    return this._http_adapter;
  }

  // backward compatibility
  get batch_size() {
    return 30;
  }
  get models() {
    return {
      "text-embedding-3-small": {
        "id": "text-embedding-3-small",
        "batch_size": 50,
        "dims": 1536,
        "max_tokens": 8191,
        "name": "OpenAI Text-3 Small",
        "description": "API, 8,191 tokens, 1,536 dim",
        "endpoint": "https://api.openai.com/v1/embeddings",
        "adapter": "openai"
      },
      "text-embedding-3-large": {
        "id": "text-embedding-3-large",
        "batch_size": 50,
        "dims": 3072,
        "max_tokens": 8191,
        "name": "OpenAI Text-3 Large",
        "description": "API, 8,191 tokens, 3,072 dim",
        "endpoint": "https://api.openai.com/v1/embeddings",
        "adapter": "openai"
      },
      "text-embedding-ada-002": {
        "id": "text-embedding-ada-002",
        "batch_size": 50,
        "dims": 1536,
        "max_tokens": 8191,
        "name": "OpenAI Ada",
        "description": "API, 8,191 tokens, 1,536 dim",
        "endpoint": "https://api.openai.com/v1/embeddings",
        "adapter": "openai"
      },
    };
  }
}

export const settings_config = {
  "api_key": {
    name: 'API Key',
    type: "password",
    description: "Enter your OpenAI API key.",
  },
  "dimensions": {
    name: 'Embedding Dimensions',
    type: "dropdown",
    description: "Select the number of dimensions for the embeddings (only for text-embedding-3 models).",
    option_1: "256|256 (equivalent to ada using 'large' model)",
    option_2: "512|512 (equivalent to ada using 'small' model)",
    option_3: "1536|1536",
    option_4: "3072|3072 (uses >10X more RAM/storage than 256)",
    default: "512",
  }
}

export default {
  class: OpenAIEmbeddingModelAdapter,
  settings_config,
};
