import { CollectionItem } from 'smart-collections/item.js';

export class Model extends CollectionItem {
  get_key() {
    if (!this.data.key) {
      this.data.key = Date.now();
    }
    return this.data.key;
  }

  get model_type() {
    return this.data.model_type;
  }
  get provider_key() {
    return this.data.provider_key;
  }
  get provider() {
    const provider = this.env?.providers?.get?.(this.provider_key);
    if (!provider) {
      throw new Error(`Platform not found for key: ${this.provider_key}`);
    }
    return provider;
  }
  get instance () {
    if(!this._instance) {
      const Class = this.provider.AdapterClass;
      this._instance = new Class(this);
      this._instance.load();
    }
    return this._instance;
  }
  async get_model_key_options() {
    const models = await this.instance.get_models();
    return Object.values(models).map(model => ({
      label: model.name || model.key,
      value: model.key,
    }));
  }

  
  async count_tokens(text) {
    return this.instance.count_tokens(text);
  }
  
  /**
   * BEGIN backward compatibility to access config
   */
  get settings() {
    return this.data;
  }
  get opts() { return this.settings; }
  get model_config() { return this.settings; }
  get adapter_settings() { return this.settings; }
  get model_key() { return this.settings.model_key; }

}
