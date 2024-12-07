// Copyright (c) Brian Joseph Petro

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/**
 * Base model class that provides adapter management and configuration functionality.
 * Handles state transitions, adapter loading/unloading, and settings management.
 * 
 * @class SmartModel
 */
export class SmartModel {
  scope_name = 'smart_model';
  static defaults = {
    // override in sub-class if needed
  };
  /**
   * Create a SmartModel instance.
   * @param {Object} opts - Configuration options
   * @param {Object} opts.adapters - Map of adapter names to adapter classes
   * @param {Object} opts.settings - Model settings configuration
   * @param {Object} opts.model_config - Model-specific configuration
   * @param {string} opts.model_config.adapter - Name of the adapter to use
   * @param {string} [opts.model_key] - Optional model identifier to override settings
   * @throws {Error} If required options are missing
   */
  constructor(opts = {}) {
    this.opts = opts;
    this.validate_opts(opts);
    this.state = 'unloaded';
    this._adapter = null;
  }
  
  /**
   * Initialize the model by loading the configured adapter.
   * @async
   * @returns {Promise<void>}
   */
  async initialize() {
    this.load_adapter(this.adapter_name);
    await this.load();
  }

  /**
   * Validate required options.
   * @param {Object} opts - Configuration options
   */
  validate_opts(opts) {
    if (!opts.adapters) throw new Error("opts.adapters is required");
    if (!opts.settings) throw new Error("opts.settings is required");
  }

  /**
   * Get the current settings
   * @returns {Object} Current settings
   */
  get settings() {
    if(!this.opts.settings) this.opts.settings = {
      ...this.constructor.defaults,
    };
    return this.opts.settings;
  }

  /**
   * Get the current adapter name
   * @returns {string} Current adapter name
   */
  get adapter_name() {
    const adapter_key = this.opts.model_config?.adapter
      || this.opts.adapter
      || this.settings.adapter
      || Object.keys(this.adapters)[0]
    ;
    if(!adapter_key || !this.adapters[adapter_key]) throw new Error(`Platform "${adapter_key}" not supported`);
    return adapter_key;
  }

  /**
   * Get adapter-specific settings.
   * @returns {Object} Settings for current adapter
   */
  get adapter_settings() {
    if(!this.settings[this.adapter_name]) this.settings[this.adapter_name] = {};
    return this.settings[this.adapter_name];
  }

  get adapter_config() {
    const base_config = this.adapters[this.adapter_name]?.defaults || {};
    return {
      ...base_config,
      ...this.adapter_settings,
      ...this.opts.adapter_config
    };
  }
  /**
   * Get available models.
   * @returns {Object} Map of model objects
   */
  get models() { return this.adapter.models; }

  /**
   * Get the default model key to use
   * @returns {string} Default model identifier
   */
  get default_model_key() {
    /* override in sub-class */
    throw new Error('default_model_key must be overridden in sub-class');
  }

  /**
   * Get the current model key
   * @returns {string} Current model key
   */
  get model_key() {
    return this.opts.model_key // directly passed opts take precedence
      || this.adapter_config.model_key // then adapter config
      || this.settings.model_key // then settings
      || this.default_model_key // then default
    ;
  }

  /**
   * Get the current model configuration
   * @returns {Object} Combined base and custom model configuration
   */
  get model_config() {
    const model_key = this.model_key;
    const base_model_config = this.models[model_key] || {};
    return {
      ...this.adapter_config,
      ...base_model_config,
      ...this.opts.model_config
    };
  }

  get model_settings() {
    if(!this.settings[this.model_key]) this.settings[this.model_key] = {};
    return this.settings[this.model_key];
  }

  /**
   * Load the current adapter and transition to loaded state.
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    this.set_state('loading');
    if (!this.adapter?.loaded) {
      await this.invoke_adapter_method('load');
    }
    this.set_state('loaded');
  }

  /**
   * Unload the current adapter and transition to unloaded state.
   * @async
   * @returns {Promise<void>}
   */
  async unload() {
    if (this.adapter?.loaded) {
      this.set_state('unloading');
      await this.invoke_adapter_method('unload');
      this.set_state('unloaded');
    }
  }

  /**
   * Set the model's state.
   * @param {('unloaded'|'loading'|'loaded'|'unloading')} new_state - The new state
   * @throws {Error} If the state is invalid
   */
  set_state(new_state) {
    const valid_states = ['unloaded', 'loading', 'loaded', 'unloading'];
    if (!valid_states.includes(new_state)) {
      throw new Error(`Invalid state: ${new_state}`);
    }
    this.state = new_state;
  }
  get is_loading() { return this.state === 'loading'; }
  get is_loaded() { return this.state === 'loaded'; }
  get is_unloading() { return this.state === 'unloading'; }
  get is_unloaded() { return this.state === 'unloaded'; }


  // ADAPTERS
  /**
   * Get the map of available adapters
   * @returns {Object} Map of adapter names to adapter classes
   */
  get adapters() { return this.opts.adapters || {}; }

  /**
   * Load a specific adapter by name.
   * @async
   * @param {string} adapter_name - Name of the adapter to load
   * @throws {Error} If adapter not found or loading fails
   * @returns {Promise<void>}
   */
  async load_adapter(adapter_name) {
    this.set_adapter(adapter_name);
    if (!this._adapter.loaded) {
        this.set_state('loading');
        try {
            await this.invoke_adapter_method('load');
            this.set_state('loaded');
        } catch (err) {
            this.set_state('unloaded');
            throw new Error(`Failed to load adapter: ${err.message}`);
        }
    }
  }

  /**
   * Set an adapter instance by name without loading it.
   * @param {string} adapter_name - Name of the adapter to set
   * @throws {Error} If adapter not found
   */
  set_adapter(adapter_name) {
    const AdapterClass = this.adapters[adapter_name];
    if (!AdapterClass) {
        throw new Error(`Adapter "${adapter_name}" not found.`);
    }
    if (this._adapter?.constructor.name.toLowerCase() === adapter_name.toLowerCase()) {
        return; // Adapter already set
    }
    this._adapter = new AdapterClass(this);
  }

  /**
   * Get the current active adapter instance
   * @returns {Object} The active adapter instance
   * @throws {Error} If adapter not found
   */
  get adapter() {
    const adapter_name = this.adapter_name;
    if (!adapter_name) {
      throw new Error(`Adapter not set for model.`);
    }
    if (!this._adapter) {
      this.load_adapter(adapter_name);
    }
    return this._adapter;
  }

  /**
   * Ensure the adapter is ready to execute a method.
   * @param {string} method - Name of the method to check
   * @throws {Error} If adapter not loaded or method not implemented
   */
  ensure_adapter_ready(method) {
    if (!this.adapter) {
      throw new Error('No adapter loaded.');
    }
    if (typeof this.adapter[method] !== 'function') {
      throw new Error(`Adapter does not implement method: ${method}`);
    }
  }

  /**
   * Invoke a method on the current adapter.
   * @async
   * @param {string} method - Name of the method to call
   * @param {...any} args - Arguments to pass to the method
   * @returns {Promise<any>} Result from the adapter method
   * @throws {Error} If adapter not ready or method fails
   */
  async invoke_adapter_method(method, ...args) {
    this.ensure_adapter_ready(method);
    return await this.adapter[method](...args);
  }



  /**
   * Get platforms as dropdown options.
   * @returns {Array<Object>} Array of {value, name} option objects
   */
  get_platforms_as_options() {
    console.log('get_platforms_as_options', this.adapters);
    return Object.entries(this.adapters).map(([key, AdapterClass]) => ({ value: key, name: AdapterClass.defaults.description || key }));
  }


  // SETTINGS
  /**
   * Get the settings configuration schema
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    return this.process_settings_config({
      adapter: {
        name: 'Model Platform',
        type: "dropdown",
        description: "Select a model platform to use with Smart Model.",
        options_callback: 'get_platforms_as_options',
        is_scope: true, // trigger re-render of settings when changed
        callback: 'adapter_changed',
        default: 'default',
      },
    });
  }

  /**
   * Process settings configuration with conditionals and prefixes.
   * @param {Object} _settings_config - Raw settings configuration
   * @param {string} [prefix] - Optional prefix for setting keys
   * @returns {Object} Processed settings configuration
   */
  process_settings_config(_settings_config, prefix = null) {
    return Object.entries(_settings_config)
      .reduce((acc, [key, val]) => {
        if (val.conditional) {
          if (!val.conditional(this)) return acc;
          delete val.conditional; // remove conditional to prevent re-checking downstream
        }
        const new_key = (prefix ? prefix + "." : "") + this.process_setting_key(key);
        acc[new_key] = val;
        return acc;
      }, {})
    ;
  }

  /**
   * Process an individual setting key.
   * Example: replace placeholders with actual adapter names.
   * @param {string} key - The setting key with placeholders.
   * @returns {string} Processed setting key.
   */
  process_setting_key(key) {
    return key.replace(/\[ADAPTER\]/g, this.adapter_name);
  }

  re_render_settings() {
    if(typeof this.opts.re_render_settings === 'function') this.opts.re_render_settings();
    else console.warn('re_render_settings is not a function (must be passed in model opts)');
  }
  /**
   * Reload model.
   */
  reload_model() {
    console.log('reload_model', this.opts);
    if(typeof this.opts.reload_model === 'function') this.opts.reload_model();
    else console.warn('reload_model is not a function (must be passed in model opts)');
  }
  adapter_changed() {
    this.reload_model();
    this.re_render_settings();
  }
  model_changed() {
    this.reload_model();
    this.re_render_settings();
  }

  // /**
  //  * Render settings.
  //  * @param {HTMLElement} [container] - Container element
  //  * @param {Object} [opts] - Render options
  //  * @returns {Promise<HTMLElement>} Container element
  //  */
  // async render_settings(container=this.settings_container, opts = {}) {
  //   if(!this.settings_container || container !== this.settings_container) this.settings_container = container;
  //   const model_type = this.constructor.name.toLowerCase().replace('smart', '').replace('model', '');
  //   let model_settings_container;
  //   if(this.settings_container) {
  //     const container_id = `#${model_type}-model-settings-container`;
  //     model_settings_container = this.settings_container.querySelector(container_id);
  //     if(!model_settings_container) {
  //       model_settings_container = document.createElement('div');
  //       model_settings_container.id = container_id;
  //       this.settings_container.appendChild(model_settings_container);
  //     }
  //     model_settings_container.innerHTML = '<div class="sc-loading">Loading ' + this.adapter_name + ' settings...</div>';
  //   }
  //   const frag = await this.render_settings_component(this, opts);
  //   if(model_settings_container) {
  //     model_settings_container.innerHTML = '';
  //     model_settings_container.appendChild(frag);
  //     this.smart_view.on_open_overlay(model_settings_container);
  //   }
  //   return frag;
  // }
}