import {
  SmartEmbedOpenRouterAdapter,
} from "smart-embed-model/adapters/open_router.js";

export class OpenRouterEmbeddingModelAdapter extends SmartEmbedOpenRouterAdapter {
  // LEGACY: remove after models created with the old OpenRouter default have
  // been migrated to the provider-qualified ID.
  static sync_model_data(model_item) {
    let changed = false;

    if (model_item.data.model_key === 'text-embedding-3-small') {
      model_item.data.model_key = 'openai/text-embedding-3-small';
      changed = true;
    }

    const provider_models = model_item.data.provider_models;
    const legacy_fallback = Object.keys(provider_models || {}).length === 1
      && provider_models?.['text-embedding-3-small']?.description
        === 'OpenRouter embedding model'
    ;
    if (legacy_fallback) {
      delete model_item.data.provider_models;
      changed = true;
    }

    if (changed) model_item.queue_save();
    return changed;
  }

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
}
export const settings_config = {
  model_key: {
    type: 'dropdown',
    name: 'Model',
    description: 'The model to use from the selected provider.',
    options_callback() {
      return this.get_model_key_options();
    },
    async callback(value, setting) {
      delete this.data.dims;
      this.model_changed('model_key', value, setting);
      return this.instance.load();
    },
  },
  api_key: {
    name: 'OpenRouter API key for embeddings',
    type: 'secret',
    description: 'Required for OpenRouter embedding models.',
    placeholder: 'Select an OpenRouter credential.',
  },
};

export default {
  class: OpenRouterEmbeddingModelAdapter,
  settings_config,
};
