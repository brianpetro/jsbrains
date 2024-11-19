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
    const adapter_name = this.model_config.adapter;
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
   * @param {string} key - Setting key to process
   * @returns {string} Processed setting key
   */
  process_setting_key(key) { return key; } // override in sub-class if needed for prefixes and variable replacements
}