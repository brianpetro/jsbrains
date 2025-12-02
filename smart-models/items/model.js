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

  get env_config() {
    return this.env.config.collections[this.collection_key];
  }

  get provider_config() {
    return this.env_config.providers?.[this.provider_key] || {};
  }

  get ProviderAdapterClass() {
    return this.provider_config.class;
  }

  get instance() {
    if (!this._instance) {
      const Class = this.ProviderAdapterClass;
      this._instance = new Class(this);
      // // backward compatibility: load provider_models into data (for settings.id matching model_key)
      // if (!this.data.provider_models || Object.keys(this.data.provider_models).length === 0) {
      //   this.data.provider_models = this._instance.models;
      // }
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

  get api_key() {
    return this.data.api_key;
  }

  /**
   * Create (or reuse) a proxy around a target settings object so that
   * any mutations trigger queue_save on the model.
   * Proxies are cached per-target via WeakMap to support deep nested objects.
   *
   * @param {Object} target - The settings object or nested object to wrap.
   * @returns {Object} Proxied object or original value if not an object.
   * @private
   */
  create_settings_proxy(target) {
    if (!target || typeof target !== 'object') return target;

    if (!this._settings_proxy_map) {
      this._settings_proxy_map = new WeakMap();
    }

    const existing = this._settings_proxy_map.get(target);
    if (existing) return existing;

    const self = this;
    const handler = {
      get(target_obj, prop, receiver) {
        const value = Reflect.get(target_obj, prop, receiver);
        if (value && typeof value === 'object') {
          // Wrap nested objects/arrays so deep changes trigger queue_save
          return self.create_settings_proxy(value);
        }
        return value;
      },
      set(target_obj, prop, value, receiver) {
        const previous = target_obj[prop];
        const result = Reflect.set(target_obj, prop, value, receiver);
        if (previous !== value) {
          self.queue_save();
          self.collection.process_save_queue();
        }
        return result;
      },
      deleteProperty(target_obj, prop) {
        const had = Object.prototype.hasOwnProperty.call(target_obj, prop);
        const result = Reflect.deleteProperty(target_obj, prop);
        if (had) {
          self.queue_save();
          self.collection.process_save_queue();
        }
        return result;
      }
    };

    const proxy = new Proxy(target, handler);
    this._settings_proxy_map.set(target, proxy);
    return proxy;
  }

  /**
   * Reactive settings view for this model.
   * Mutating any property (including nested objects/arrays) via this proxy
   * will call queue_save().
   *
   * @returns {Object} Proxied view of this.data.
   */
  get settings() {
    return this.create_settings_proxy(this.data);
  }

  get model_key() {
    return this.data.model_key;
  }

  /**
   * @deprecated included for backward compatibility
   */
  get opts() {
    return this.settings;
  }
}
