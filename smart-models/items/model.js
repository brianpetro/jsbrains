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

  get model_type() {
    return this.data.model_type;
  }

  get_key() {
    if (this.data?.key) return this.data.key;
    this.data.key = `${this.model_type}#${Date.now()}`;
    return this.data.key;
  }

  get platform_key() {
    return this.data.platform_key;
  }

  get platform() {
    const platform = this.env?.platforms?.get?.(this.platform_key);
    if (!platform) {
      throw new Error(`Platform not found for key: ${this.platform_key}`);
    }
    return platform;
  }

  get platform_data() {
    return this.platform?.data;
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

  get_model_instance(extra_opts = {}) {
    return this.model_type_adapter.get_model_instance(extra_opts);
  }
  get model_instance() {
    return this.get_model_instance();
  }

  // get settings_config() {
  //   const settings_config = env.config.smart_embed_model.settings_config;
  //   const instance = this.model_type_adapter.get_model_instance({
  //     re_render_settings: () => this.collection?.reload_item_settings?.(this),
  //     reload_model: () => this.collection?.reload_model_instance?.(this),
  //   });
  //   return instance.settings_config;
  // }

  get settings() {
    return {
      ...(this.model_type_adapter.ModelClass.defaults || {}),
      ...this.data,
    };
  }
  async get_model_key_options() {
    return this.model_type_adapter.get_model_key_options();
  }

  /**
   * BEGIN backward compatibility to access config
   */
  get opts() { return this.settings; }
  get model_config() { return this.settings; }
  get adapter_settings() { return this.settings; }

}

export default Model;
