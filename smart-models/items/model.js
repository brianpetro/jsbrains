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
      this.data.created_at = Date.now();
      this.data.key = `${this.data.provider_key}#${this.data.created_at}`;
    }
    return this.data.key;
  }

  get provider_key() {
    return this.data.provider_key;
  }

  get env_config() {
    return this.collection.env_config;
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
          self.debounce_save();
        }
        return result;
      },
      deleteProperty(target_obj, prop) {
        const had = Object.prototype.hasOwnProperty.call(target_obj, prop);
        const result = Reflect.deleteProperty(target_obj, prop);
        if (had) {
          self.debounce_save();
        }
        return result;
      }
    };

    const proxy = new Proxy(target, handler);
    this._settings_proxy_map.set(target, proxy);
    return proxy;
  }

  debounce_save(ms = 100) {
    this.emit_event('model:changed');
    if (this._debounce_save_timeout) {
      clearTimeout(this._debounce_save_timeout);
    }
    this._debounce_save_timeout = setTimeout(() => {
      this.queue_save();
      this.collection.process_save_queue();
      this._debounce_save_timeout = null;
    }, ms);
  }

  async get_model_key_options() {
    const model_configs = await this.instance.get_models();
    return Object.entries(model_configs).map(([key, model_config]) => ({
      label: model_config.name || key,
      value: model_config.key || key,
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
  model_changed(key, value, elm) {
    if (key === 'model_key') {
      this.data.model_key = value;
      const model_defaults = this.data.provider_models?.[this.data.model_key] || {};
      const adapter_defaults = this.ProviderAdapterClass.defaults || {};
      delete this.data.test_passed;
      this.data = {
        ...this.data,
        ...adapter_defaults,
        ...model_defaults,
      };
    }
    // emit model:changed for settings that change output behavior
    if (!['api_key', 'meta.name'].includes(key)) {
      this.emit_event('model:changed');
    }
  }
  /**
   * @abstract should be implemented by subclasses
   */
  async test_model() {}
  get display_name() {
    return this.data.meta?.name || `${this.data.provider_key} - ${this.data.model_key}`;
  }
  get settings_config () {
    return {
      provider_key: {
        type: 'html',
        value: `<p><strong>Provider:</strong> ${this.data.provider_key}</p>`,
      },
      'meta.name': {
        type: 'text',
        name: 'Name',
        description: 'A friendly name for this model configuration.',
      },
      model_key: {
        type: 'dropdown',
        name: 'Model',
        description: 'The model to use from the selected provider.',
        options_callback: 'get_model_key_options',
        callback: 'model_changed',
      },
      // add model_changed callback to each provider setting that doesn't already have callback defined 
      ...Object.fromEntries(
        Object.entries(this.provider_config.settings_config || {}).map(
          ([setting_key, setting_config]) => (
            [ setting_key, { ...setting_config, callback: setting_config.callback || 'model_changed' }]
          )
        )
      )
    };
  }

  delete_model() {
    this.delete();
    this.debounce_save(); // emits model:changed
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
