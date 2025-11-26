import { SmartEmbedModel } from 'smart-embed-model';
import * as embed_adapters from 'smart-embed-model/adapters.js';
import { ModelTypeAdapter } from './_adapter.js';

export class EmbeddingModelTypeAdapter extends ModelTypeAdapter {
  build_model_opts(extra_opts = {}) {
    const adapter_key = this.adapter_key;
    const model_data = this.model?.data?.model || {};

    const base_opts = {
      adapter: adapter_key,
      adapters: embed_adapters,
      model_config: {
        adapter: adapter_key,
        ...(model_data.adapter_config || {}),
      },
      model_key: model_data.model_key,
      settings: this.merge_settings(adapter_key),
      re_render_settings: extra_opts.re_render_settings,
      reload_model: extra_opts.reload_model,
      env: this.model.env,
    };

    return this.merge_opts(base_opts, extra_opts);
  }

  get_model_instance(extra_opts = {}) {
    const has_extra_opts = this.has_extra_opts(extra_opts);
    if (!this._model_instance || has_extra_opts) {
      const opts = this.build_model_opts(extra_opts);
      if (has_extra_opts) return new SmartEmbedModel(opts);
      this._model_instance = new SmartEmbedModel(opts);
    }
    return this._model_instance;
  }
}

export default EmbeddingModelTypeAdapter;
