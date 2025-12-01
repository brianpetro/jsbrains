import { CollectionItem } from 'smart-collections/item.js';

export class Model extends CollectionItem {
  /**
   * Default properties for an instance of CollectionItem.
   * @returns {Object}
   */
  static get defaults() {
    return {
      data: {
        api_key: '',
        provider_key: '',
        model_key: '',
      }
    };
  }

  get_key() {
    if (!this.data.key) {
      this.data.key = `${this.data.provider_key}#${Date.now()}`;
    }
    return this.data.key;
  }
  get provider_key() {
    return this.data.provider_key;
  }
  get env_config () {
    return this.env.config.collections[this.collection_key];
  }
  get provider_config () {
    return this.env_config.providers?.[this.provider_key] || {};
  }
  get ProviderAdapterClass() {
    return this.provider_config.class;
  }
  get instance () {
    if(!this._instance) {
      const Class = this.ProviderAdapterClass;
      this._instance = new Class(this);
      this._instance.load();
      this.once_event('model:changed', () => {
        this._instance.unload?.();
        this._instance = null;
      });
    }
    return this._instance;
  }
  async get_model_key_options() {
    const models = await this.instance.get_models();
    return Object.entries(models).map(([key, model]) => ({
      label: model.name || key,
      value: model.key || key,
    })).sort((a, b) => {
      // sort by if contains "free" first, then alphabetically
      if (a.label.toLowerCase().includes('free') && !b.label.toLowerCase().includes('free')) {
        return -1;
      }
      if (!a.label.toLowerCase().includes('free') && b.label.toLowerCase().includes('free')) {
        return 1;
      }
      return a.label.localeCompare(b.label);
    });
  }
  
  async count_tokens(text) {
    return this.instance.count_tokens(text);
  }
  
  /**
   * BEGIN backward compatibility to access config
   */
  get settings() {
    this.data = {
      ...this.data,
      ...this.ProviderAdapterClass.defaults,
      ...(this.data.provider_models?.[this.model_key] || {}),
    }
    return this.data;
  }
  get opts() { return this.settings; }
  get model_config() { return this.settings; }
  get adapter_settings() { return this.settings; }
  get model_key() { return this.data.model_key; }

}
