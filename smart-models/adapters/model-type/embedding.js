import { ModelTypeAdapter } from './_adapter.js';

export class EmbeddingModelTypeAdapter extends ModelTypeAdapter {
  static init(models_collection) {
    console.log('Initializing EmbeddingModelTypeAdapter...');
    // add embedding#default item
    const existing = models_collection.get('embedding#default');
    if (!existing) {
      const env = models_collection.env;
      const platforms_collection = env.platforms;
      let platform = platforms_collection.get('transformers#default');
      if (!platform) {
        platform = platforms_collection.new_platform({
          key: 'transformers#default',
          platform_type: 'transformers',
          adapter_key: 'transformers',
        });
      }
      platform.new_model({
        key: 'embedding#default',
        model_type: 'embedding',
        model_key: 'TaylorAI/bge-micro-v2',
      });
    }
  }

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
      this._model_instance.load();
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
