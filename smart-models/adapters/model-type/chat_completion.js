import { ModelTypeAdapter } from './_adapter.js';

export class ChatCompletionModelTypeAdapter extends ModelTypeAdapter {
  static init(models_collection) {
    console.log('Initializing ChatCompletionModelTypeAdapter...');
    // add chat_completion#default item
    const existing = models_collection.get('chat_completion#default');
    if (!existing) {
      const env = models_collection.env;
      let platform = env.model_platforms.get('open_router#default');
      if (!platform) {
        platform = env.model_platforms.new_platform({
          key: 'open_router#default',
          adapter_key: 'open_router',
        });
      }
      platform.new_model({
        key: 'chat_completion#default',
        model_type: 'chat_completion',
        model_key: '',
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

  get_model_instance() {
    if (!this._model_instance) {
      this._model_instance = new this.ModelClass(this.model);
      this._model_instance.load();
    }
    return this._model_instance;
  }
  async get_model_key_options() {
    const model_instance = this.get_model_instance();
    const models = await model_instance.get_models(true);
    console.log('ChatCompletionModelTypeAdapter model options:', models);
    return Object.values(models).map(model => ({
      label: model.name || model.key,
      value: model.key,
    }));
  }
}

export default ChatCompletionModelTypeAdapter;
