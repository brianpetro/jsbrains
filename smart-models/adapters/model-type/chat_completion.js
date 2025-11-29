import { ModelTypeAdapter } from './_adapter.js';

export class ChatCompletionModelTypeAdapter extends ModelTypeAdapter {
  static init(models_collection) {
    console.log('Initializing ChatCompletionModelTypeAdapter...');
    // add chat_completion#default item
    const existing = models_collection.get('chat_completion#default');
    if (!existing) {
      const env = models_collection.env;
      const platforms_collection = env.model_platforms;
      let platform = platforms_collection.get('openai#default');
      if (!platform) {
        platform = platforms_collection.new_platform({
          key: 'openai#default',
          adapter_key: 'openai',
        });
      }
      platform.new_model({
        key: 'chat_completion#default',
        model_type: 'chat_completion',
        model_key: 'gpt-5-nano',
      });
    }
  }

  get model_env_config() {
    return this.model.env.config.chat_completion_models[this.adapter_key];
  }
  get ModelClass() {
    const ModelClass = this.env.config.chat_completion_models[this.adapter_key]?.class;
    if (!ModelClass) throw new Error(`No ModelClass found for chat_completion adapter_key '${this.adapter_key}'`);
    return ModelClass;
  }

  get_model_instance(extra_opts = {}) {
    const has_extra_opts = this.has_extra_opts(extra_opts);
    if (!this._model_instance || has_extra_opts) {
      const opts = this.build_model_opts(extra_opts);
      if (has_extra_opts) return new this.ModelClass(opts);
      this._model_instance = new this.ModelClass(opts);
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

export default ChatCompletionModelTypeAdapter;
