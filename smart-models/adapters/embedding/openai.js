import {
  SmartEmbedOpenAIAdapter,
} from "smart-embed-model/adapters/openai.js";

const openai_models = {
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

export class OpenAIEmbeddingModelAdapter extends SmartEmbedOpenAIAdapter {
  static sync_model_data(model_item) {
    const model_profile = openai_models[model_item.data.model_key];
    if (!model_profile) return false;

    const should_default_dimensions = model_item.data.model_key !== 'text-embedding-ada-002'
      && !model_item.data.dimensions
    ;
    const dims = model_item.data.model_key === 'text-embedding-ada-002'
      ? model_profile.dims
      : Number(model_item.data.dimensions || 512)
    ;
    const changed = should_default_dimensions
      || model_item.data.dims !== dims
      || model_item.data.max_tokens !== model_profile.max_tokens
      || model_item.data.endpoint !== model_profile.endpoint
    ;
    if (!changed) return false;

    if (should_default_dimensions) model_item.data.dimensions = '512';
    model_item.data.dims = dims;
    model_item.data.max_tokens = model_profile.max_tokens;
    model_item.data.endpoint = model_profile.endpoint;
    model_item.queue_save?.();
    return true;
  }

  constructor(model_item) {
    super(model_item);
    this.constructor.sync_model_data(model_item);
  }

  get http_adapter() {
    if (!this._http_adapter) {
      const HttpClass = this.model.env.config.modules.http_adapter.class;
      const http_params = {...this.model.env.config.modules.http_adapter, class: undefined};
      this._http_adapter = new HttpClass(http_params);
    }
    return this._http_adapter;
  }

  get dims() {
    if (this.model_key === 'text-embedding-ada-002') return 1536;
    return Number(this.model.data.dimensions || 512);
  }

  async embed_batch(inputs) {
    this.model.data.dims = this.dims;
    return await super.embed_batch(inputs);
  }

  // backward compatibility
  get batch_size() {
    return 30;
  }
  get models() {
    return openai_models;
  }
}

export const settings_config = {
  "api_key": {
    name: 'API Key',
    type: "secret",
    description: "Enter your OpenAI API key.",
  },
  "dimensions": {
    name: 'Embedding Dimensions',
    type: "dropdown",
    description: "Select the number of dimensions for the embeddings (only for text-embedding-3 models).",
    options_callback() {
      return [
        { value: '256', label: "256 (equivalent to ada using 'large' model)" },
        { value: '512', label: "512 (equivalent to ada using 'small' model)" },
        { value: '1536', label: '1536' },
        { value: '3072', label: '3072 (uses >10X more RAM/storage than 256)' },
      ];
    },
    default: "512",
  }
}

export default {
  class: OpenAIEmbeddingModelAdapter,
  settings_config,
};
