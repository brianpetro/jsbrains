import { CollectionItem } from 'smart-collections/item.js';

export class Model extends CollectionItem {
  static get defaults() {
    return {
      ...super.defaults,
      data: {
        model: {},
      },
    };
  }
  get_key() {
    if (this.data?.key) return this.data.key;
    this.data.key = `${this.model_type}#${Date.now()}`;
    return this.data.key;
  }

  get model_type() {
    return this.data.model_type;
  }
  get model_platform_key() {
    return this.data.model_platform_key;
  }
  get model_platform() {
    const platform = this.env?.model_platforms?.get?.(this.model_platform_key);
    if (!platform) {
      throw new Error(`Platform not found for key: ${this.model_platform_key}`);
    }
    return platform;
  }
  get model_type_adapters() {
    return this.collection?.model_type_adapters
      || this.collection?.opts?.model_type_adapters
      || {};
  }
  get model_type_adapter() {
    if (!this._model_type_adapter) {
      const adapter_class = this.model_type_adapters[this.model_type];
      if (!adapter_class) {
        throw new Error(`No model_type_adapter found for model_type '${this.model_type}'`);
      }
      this._model_type_adapter = new adapter_class(this);
    }
    return this._model_type_adapter;
  }

  get model_instance() {
    return this.get_model_instance();
  }
  get_model_instance(extra_opts = {}) {
    return this.model_type_adapter.get_model_instance(extra_opts);
  }
  async get_model_key_options() {
    return this.model_type_adapter.get_model_key_options();
  }
  get settings() {
    return {
      ...(this.model_type_adapter.ModelClass.defaults || {}),
      ...this.data,
    };
  }

  /**
   * BEGIN backward compatibility to access config
   */
  get opts() { return this.settings; }
  get model_config() { return this.settings; }
  get adapter_settings() { return this.settings; }
  get model_key() { return this.settings.model_key; }

}

export default Model;
