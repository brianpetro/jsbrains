import { SmartEmbedModel } from 'smart-embed-model';
import { ModelTypeAdapter } from './_adapter.js';

export class EmbeddingModelTypeAdapter extends ModelTypeAdapter {
  // build_model_opts(extra_opts = {}) {
  //   const adapter_key = this.adapter_key;
  //   const model_data = this.model?.data?.model || {};

  //   // build defaults from model_env_config.settings_config{[prop]: {default}}
  //   const defaults = {};
  //   const settings_config = this.model_env_config?.settings_config || {};
  //   for (const [prop, config] of Object.entries(settings_config)) {
  //     if (config?.hasOwnProperty('default')) {
  //       defaults[prop] = config.default;
  //     }
  //   }
  //   const base_opts = {
  //     adapter: adapter_key,
  //     adapters: this.model.env.config.modules.smart_embed_model.adapters,
  //     model_config: {
  //       adapter: adapter_key,
  //       ...(model_data.adapter_config || {}),
  //     },
  //     model_key: model_data.model_key,
  //     settings: this.merge_settings(adapter_key),
  //     re_render_settings: extra_opts.re_render_settings,
  //     reload_model: extra_opts.reload_model,
  //     env: this.model.env,
  //   };

  //   return this.merge_opts(base_opts, extra_opts);
  // }

  get model_env_config() {
    return this.model.env.config.embedding_models[this.adapter_key];
  }
  get ModelClass() {
    const ModelClass = this.env.config.embedding_models[this.adapter_key]?.class;
    if (!ModelClass) throw new Error(`No ModelClass found for embedding adapter_key '${this.adapter_key}'`);
    return ModelClass;
  }

  get_model_instance(extra_opts = {}) {
    if (!this._model_instance) {
      // const opts = this.build_model_opts();
      this._model_instance = new this.ModelClass(this.model);
    }
    return this._model_instance;
  }
  async get_model_key_options() {
    const model_instance = this.get_model_instance();
    const models = await model_instance.get_models();
    return Object.values(models).map(model => ({
      label: model.name || model.key,
      value: model.key,
    }));
  }
}

export default EmbeddingModelTypeAdapter;
