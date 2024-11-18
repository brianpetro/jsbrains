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
 */
export class SmartModel {
  /**
   * Create a SmartModel instance.
   * @param {Object} opts - Configuration options
   * @param {string} [opts.adapter] - Initial adapter to load
   * @param {Object} [opts.adapters] - Map of available adapters
   * @param {Object} [opts.settings] - Model settings
   * @param {Object} [opts.model_config] - Model-specific configuration
   */
  constructor(opts = {}) {
    this.opts = opts;
    this.validate_opts(opts);
    this.state = 'unloaded';
    this._adapter = null;
  }
  
  async initialize() {
    this.load_adapter(this.model_config.adapter);
    await this.load();
  }

  /**
   * Validate required options.
   * @param {Object} opts - Configuration options
   */
  validate_opts(opts) {
    if (!opts.adapters) throw new Error("opts.adapters is required");
    if (!opts.settings) throw new Error("opts.settings is required");
    if (!this.model_config.adapter) {
      throw new Error("model_config.adapter is required");
    }
  }
  /**
   * Get the default model key to use
   * @returns {string} Default model identifier
   */
  get default_model_key() {
    /* override in sub-class */
    throw new Error('default_model_key must be overridden in sub-class');
  }
  /**
   * Get available models configuration
   * @returns {Object} Map of model configurations
   */
  get models() { /* override in sub-class (likely using a models.json file) */ }

  /**
   * Get the current model key
   * @returns {string} Current model key
   */
  get model_key() {
    return this.opts.model_key // directly passed opts take precedence
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
    const base_config = this.models[model_key] || {};
    return {
      ...base_config,
      ...this.settings,
      ...this.opts.model_config
    };
  }

  /**
   * Get the current settings
   * @returns {Object} Current settings
   */
  get settings() { return this.opts.settings; }

  async load() {
    this.set_state('loading');
    if (!this.adapter?.loaded) {
      await this.invoke_adapter_method('load');
    }
    this.set_state('loaded');
  }

  async unload() {
    if (this.adapter?.loaded) {
      this.set_state('unloading');
      await this.invoke_adapter_method('unload');
      this.set_state('unloaded');
    }
  }

  /**
   * Set the state of the SmartModel.
   * @param {string} new_state - The new state to set.
   */
  set_state(new_state) {
    const valid_states = ['unloaded', 'loading', 'loaded', 'unloading'];
    if (!valid_states.includes(new_state)) {
      throw new Error(`Invalid state: ${new_state}`);
    }
    this.state = new_state;
  }
  // Replace individual state getters/setters with a unified state management
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
   * Get the current active adapter instance
   * @returns {Object} The active adapter instance
   * @throws {Error} If adapter not found
   */
  get adapter() {
    const adapter_name = this.model_config.adapter;
    if (!adapter_name) {
      throw new Error(`Adapter not set for model.`);
    }
    if (!this._adapter) {
      this.load_adapter(adapter_name);
    }
    return this._adapter;
  }

  ensure_adapter_ready(method) {
    if (!this.adapter) {
      throw new Error('No adapter loaded.');
    }
    if (typeof this.adapter[method] !== 'function') {
      throw new Error(`Adapter does not implement method: ${method}`);
    }
  }


  /**
   * Delegate method calls to the active adapter.
   * @param {string} method - The method to call on the adapter.
   * @param {...any} args - Arguments to pass to the adapter method.
   * @returns {any} The result of the adapter method call.
   */
  async invoke_adapter_method(method, ...args) {
    this.ensure_adapter_ready(method);
    return await this.adapter[method](...args);
  }





  // SETTINGS
  /**
   * Get the settings configuration schema
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    return this.process_settings_config({
      // SETTINGS GO HERE
    });
  }

  /**
   * Process settings configuration with conditionals and prefixes
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
   * Process individual setting key for prefixes/variables
   * @param {string} key - Setting key to process
   * @returns {string} Processed setting key
   */
  process_setting_key(key) { return key; } // override in sub-class if needed for prefixes and variable replacements
}