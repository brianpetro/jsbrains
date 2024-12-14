var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// ../smart-model/smart_model.js
var SmartModel = class {
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
    __publicField(this, "scope_name", "smart_model");
    this.opts = opts;
    this.validate_opts(opts);
    this.state = "unloaded";
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
    if (!this.opts.settings) this.opts.settings = {
      ...this.constructor.defaults
    };
    return this.opts.settings;
  }
  /**
   * Get the current adapter name
   * @returns {string} Current adapter name
   */
  get adapter_name() {
    const adapter_key = this.opts.model_config?.adapter || this.opts.adapter || this.settings.adapter || Object.keys(this.adapters)[0];
    if (!adapter_key || !this.adapters[adapter_key]) throw new Error(`Platform "${adapter_key}" not supported`);
    return adapter_key;
  }
  /**
   * Get adapter-specific settings.
   * @returns {Object} Settings for current adapter
   */
  get adapter_settings() {
    if (!this.settings[this.adapter_name]) this.settings[this.adapter_name] = {};
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
  get models() {
    return this.adapter.models;
  }
  /**
   * Get the default model key to use
   * @returns {string} Default model identifier
   */
  get default_model_key() {
    throw new Error("default_model_key must be overridden in sub-class");
  }
  /**
   * Get the current model key
   * @returns {string} Current model key
   */
  get model_key() {
    return this.opts.model_key || this.adapter_config.model_key || this.settings.model_key || this.default_model_key;
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
    if (!this.settings[this.model_key]) this.settings[this.model_key] = {};
    return this.settings[this.model_key];
  }
  /**
   * Load the current adapter and transition to loaded state.
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    this.set_state("loading");
    if (!this.adapter?.loaded) {
      await this.invoke_adapter_method("load");
    }
    this.set_state("loaded");
  }
  /**
   * Unload the current adapter and transition to unloaded state.
   * @async
   * @returns {Promise<void>}
   */
  async unload() {
    if (this.adapter?.loaded) {
      this.set_state("unloading");
      await this.invoke_adapter_method("unload");
      this.set_state("unloaded");
    }
  }
  /**
   * Set the model's state.
   * @param {('unloaded'|'loading'|'loaded'|'unloading')} new_state - The new state
   * @throws {Error} If the state is invalid
   */
  set_state(new_state) {
    const valid_states = ["unloaded", "loading", "loaded", "unloading"];
    if (!valid_states.includes(new_state)) {
      throw new Error(`Invalid state: ${new_state}`);
    }
    this.state = new_state;
  }
  get is_loading() {
    return this.state === "loading";
  }
  get is_loaded() {
    return this.state === "loaded";
  }
  get is_unloading() {
    return this.state === "unloading";
  }
  get is_unloaded() {
    return this.state === "unloaded";
  }
  // ADAPTERS
  /**
   * Get the map of available adapters
   * @returns {Object} Map of adapter names to adapter classes
   */
  get adapters() {
    return this.opts.adapters || {};
  }
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
      this.set_state("loading");
      try {
        await this.invoke_adapter_method("load");
        this.set_state("loaded");
      } catch (err) {
        this.set_state("unloaded");
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
      return;
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
      throw new Error("No adapter loaded.");
    }
    if (typeof this.adapter[method] !== "function") {
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
    console.log("get_platforms_as_options", this.adapters);
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
        name: "Model Platform",
        type: "dropdown",
        description: "Select a model platform to use with Smart Model.",
        options_callback: "get_platforms_as_options",
        is_scope: true,
        // trigger re-render of settings when changed
        callback: "adapter_changed",
        default: "default"
      }
    });
  }
  /**
   * Process settings configuration with conditionals and prefixes.
   * @param {Object} _settings_config - Raw settings configuration
   * @param {string} [prefix] - Optional prefix for setting keys
   * @returns {Object} Processed settings configuration
   */
  process_settings_config(_settings_config, prefix = null) {
    return Object.entries(_settings_config).reduce((acc, [key, val]) => {
      if (val.conditional) {
        if (!val.conditional(this)) return acc;
        delete val.conditional;
      }
      const new_key = (prefix ? prefix + "." : "") + this.process_setting_key(key);
      acc[new_key] = val;
      return acc;
    }, {});
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
    console.log("re_render_settings", this.opts);
    if (typeof this.opts.re_render_settings === "function") this.opts.re_render_settings();
    else console.warn("re_render_settings is not a function (must be passed in model opts)");
  }
  /**
   * Reload model.
   */
  reload_model() {
    console.log("reload_model", this.opts);
    if (typeof this.opts.reload_model === "function") this.opts.reload_model();
    else console.warn("reload_model is not a function (must be passed in model opts)");
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
};
__publicField(SmartModel, "defaults", {
  // override in sub-class if needed
});

// smart_embed_model.js
var SmartEmbedModel = class extends SmartModel {
  /**
   * Create a SmartEmbedModel instance
   * @param {Object} opts - Configuration options
   * @param {Object} [opts.adapters] - Map of available adapter implementations
   * @param {boolean} [opts.use_gpu] - Whether to enable GPU acceleration
   * @param {number} [opts.gpu_batch_size] - Batch size when using GPU
   * @param {number} [opts.batch_size] - Default batch size for processing
   * @param {Object} [opts.model_config] - Model-specific configuration
   * @param {string} [opts.model_config.adapter] - Override adapter type
   * @param {number} [opts.model_config.dims] - Embedding dimensions
   * @param {number} [opts.model_config.max_tokens] - Maximum tokens to process
   * @param {Object} [opts.settings] - User settings
   * @param {string} [opts.settings.api_key] - API key for remote models
   * @param {number} [opts.settings.min_chars] - Minimum text length to embed
   */
  constructor(opts = {}) {
    super(opts);
    __publicField(this, "scope_name", "smart_embed_model");
  }
  /**
   * Count tokens in an input string
   * @param {string} input - Text to tokenize
   * @returns {Promise<Object>} Token count result
   * @property {number} tokens - Number of tokens in input
   * 
   * @example
   * ```javascript
   * const result = await model.count_tokens("Hello world");
   * console.log(result.tokens); // 2
   * ```
   */
  async count_tokens(input) {
    return await this.invoke_adapter_method("count_tokens", input);
  }
  /**
   * Generate embeddings for a single input
   * @param {string|Object} input - Text or object with embed_input property
   * @returns {Promise<Object>} Embedding result
   * @property {number[]} vec - Embedding vector
   * @property {number} tokens - Token count
   * 
   * @example
   * ```javascript
   * const result = await model.embed("Hello world");
   * console.log(result.vec); // [0.1, 0.2, ...]
   * ```
   */
  async embed(input) {
    if (typeof input === "string") input = { embed_input: input };
    return (await this.embed_batch([input]))[0];
  }
  /**
   * Generate embeddings for multiple inputs in batch
   * @param {Array<string|Object>} inputs - Array of texts or objects with embed_input
   * @returns {Promise<Array<Object>>} Array of embedding results
   * @property {number[]} vec - Embedding vector for each input
   * @property {number} tokens - Token count for each input
   * 
   * @example
   * ```javascript
   * const results = await model.embed_batch([
   *   { embed_input: "First text" },
   *   { embed_input: "Second text" }
   * ]);
   * ```
   */
  async embed_batch(inputs) {
    return await this.invoke_adapter_method("embed_batch", inputs);
  }
  /**
   * Get the current batch size based on GPU settings
   * @returns {number} Current batch size for processing
   */
  get batch_size() {
    return this.adapter.batch_size || 1;
  }
  /**
   * Get settings configuration schema
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    const _settings_config = {
      adapter: {
        name: "Embedding Model Platform",
        type: "dropdown",
        description: "Select an embedding model platform.",
        options_callback: "get_platforms_as_options",
        callback: "adapter_changed",
        default: this.constructor.defaults.adapter
      },
      ...this.adapter.settings_config || {}
    };
    return this.process_settings_config(_settings_config);
  }
  process_setting_key(key) {
    return key.replace(/\[ADAPTER\]/g, this.adapter_name);
  }
  /**
   * Get available embedding model options
   * @returns {Array<Object>} Array of model options with value and name
   */
  get_embedding_model_options() {
    return Object.entries(this.models).map(([key, model2]) => ({ value: key, name: key }));
  }
  /**
   * Get embedding model options including 'None' option
   * @returns {Array<Object>} Array of model options with value and name
   */
  get_block_embedding_model_options() {
    const options = this.get_embedding_model_options();
    options.unshift({ value: "None", name: "None" });
    return options;
  }
};
__publicField(SmartEmbedModel, "defaults", {
  adapter: "transformers"
});

// ../smart-model/adapters/_adapter.js
var SmartModelAdapter = class {
  /**
   * Create a SmartModelAdapter instance.
   * @param {SmartModel} model - The parent SmartModel instance
   */
  constructor(model2) {
    this.model = model2;
    this.state = "unloaded";
  }
  /**
   * Load the adapter.
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    this.set_state("loaded");
  }
  /**
   * Unload the adapter.
   * @returns {void}
   */
  unload() {
    this.set_state("unloaded");
  }
  /**
   * Get all settings.
   * @returns {Object} All settings
   */
  get settings() {
    return this.model.settings;
  }
  /**
   * Get the current model key.
   * @returns {string} Current model identifier
   */
  get model_key() {
    return this.model.model_key;
  }
  /**
   * Get the current model configuration.
   * @returns {Object} Model configuration
   */
  get model_config() {
    return this.model.model_config;
  }
  /**
   * Get model-specific settings.
   * @returns {Object} Settings for current model
   */
  get model_settings() {
    return this.model.model_settings;
  }
  /**
   * Get adapter-specific configuration.
   * @returns {Object} Adapter configuration
   */
  get adapter_config() {
    return this.model.adapter_config;
  }
  /**
   * Get adapter-specific settings.
   * @returns {Object} Adapter settings
   */
  get adapter_settings() {
    return this.model.adapter_settings;
  }
  /**
   * Get the models.
   * @returns {Object} Map of model objects
   */
  get models() {
    if (typeof this.adapter_config.models === "object" && Object.keys(this.adapter_config.models || {}).length > 0) return this.adapter_config.models;
    else {
      return {};
    }
  }
  /**
   * Get available models from the API.
   * @abstract
   * @param {boolean} [refresh=false] - Whether to refresh cached models
   * @returns {Promise<Object>} Map of model objects
   */
  async get_models(refresh = false) {
    throw new Error("get_models not implemented");
  }
  /**
   * Validate the parameters for get_models.
   * @returns {boolean|Array<Object>} True if parameters are valid, otherwise an array of error objects
   */
  validate_get_models_params() {
    return true;
  }
  /**
   * Get available models as dropdown options synchronously.
   * @returns {Array<Object>} Array of model options.
   */
  get_models_as_options() {
    const models = this.models;
    const params_valid = this.validate_get_models_params();
    if (params_valid !== true) return params_valid;
    if (!Object.keys(models || {}).length) {
      this.get_models(true);
      return [{ value: "", name: "No models currently available" }];
    }
    return Object.values(models).map((model2) => ({ value: model2.id, name: model2.name || model2.id })).sort((a, b) => a.name.localeCompare(b.name));
  }
  /**
   * Set the adapter's state.
   * @param {('unloaded'|'loading'|'loaded'|'unloading')} new_state - The new state
   * @throws {Error} If the state is invalid
   */
  set_state(new_state) {
    const valid_states = ["unloaded", "loading", "loaded", "unloading"];
    if (!valid_states.includes(new_state)) {
      throw new Error(`Invalid state: ${new_state}`);
    }
    this.state = new_state;
  }
  // Replace individual state getters/setters with a unified state management
  get is_loading() {
    return this.state === "loading";
  }
  get is_loaded() {
    return this.state === "loaded";
  }
  get is_unloading() {
    return this.state === "unloading";
  }
  get is_unloaded() {
    return this.state === "unloaded";
  }
};

// adapters/_adapter.js
var SmartEmbedAdapter = class extends SmartModelAdapter {
  /**
   * Create adapter instance
   * @param {SmartEmbedModel} model - Parent model instance
   */
  constructor(model2) {
    super(model2);
    this.smart_embed = model2;
  }
  /**
   * Count tokens in input text
   * @abstract
   * @param {string} input - Text to tokenize
   * @returns {Promise<Object>} Token count result
   * @property {number} tokens - Number of tokens in input
   * @throws {Error} If not implemented by subclass
   */
  async count_tokens(input) {
    throw new Error("count_tokens method not implemented");
  }
  /**
   * Generate embeddings for single input
   * @abstract
   * @param {string|Object} input - Text to embed
   * @returns {Promise<Object>} Embedding result
   * @property {number[]} vec - Embedding vector
   * @property {number} tokens - Number of tokens in input
   * @throws {Error} If not implemented by subclass
   */
  async embed(input) {
    throw new Error("embed method not implemented");
  }
  /**
   * Generate embeddings for multiple inputs
   * @abstract
   * @param {Array<string|Object>} inputs - Texts to embed
   * @returns {Promise<Array<Object>>} Array of embedding results
   * @property {number[]} vec - Embedding vector for each input
   * @property {number} tokens - Number of tokens in each input
   * @throws {Error} If not implemented by subclass
   */
  async embed_batch(inputs) {
    throw new Error("embed_batch method not implemented");
  }
  get settings_config() {
    return {
      "[ADAPTER].model_key": {
        name: "Embedding Model",
        type: "dropdown",
        description: "Select an embedding model.",
        options_callback: "adapter.get_models_as_options",
        callback: "model_changed",
        default: this.constructor.defaults.default_model
      }
    };
  }
  get dims() {
    return this.model_config.dims;
  }
  get max_tokens() {
    return this.model_config.max_tokens;
  }
  // get batch_size() { return this.model_config.batch_size; }
  get use_gpu() {
    if (typeof this._use_gpu === "undefined") {
      if (typeof this.model.opts.use_gpu !== "undefined") this._use_gpu = this.model.opts.use_gpu;
      else this._use_gpu = typeof navigator !== "undefined" && !!navigator?.gpu && this.model_settings.gpu_batch_size !== 0;
    }
    return this._use_gpu;
  }
  set use_gpu(value) {
    this._use_gpu = value;
  }
  get batch_size() {
    if (this.use_gpu && this.model_config?.gpu_batch_size) return this.model_config.gpu_batch_size;
    return this.model.opts.batch_size || this.model_config.batch_size || 1;
  }
};
/**
 * @override in sub-class with adapter-specific default configurations
 * @property {string} id - The adapter identifier
 * @property {string} description - Human-readable description
 * @property {string} type - Adapter type ("API")
 * @property {string} endpoint - API endpoint
 * @property {string} adapter - Adapter identifier
 * @property {string} default_model - Default model to use
 */
__publicField(SmartEmbedAdapter, "defaults", {});

// adapters/transformers.js
var transformers_defaults = {
  adapter: "transformers",
  description: "Transformers (Local, built-in)",
  default_model: "TaylorAI/bge-micro-v2"
};
var SmartEmbedTransformersAdapter = class extends SmartEmbedAdapter {
  /**
   * Create transformers adapter instance
   * @param {SmartEmbedModel} model - Parent model instance
   */
  constructor(model2) {
    super(model2);
    this.pipeline = null;
    this.tokenizer = null;
  }
  /**
   * Load model and tokenizer
   * @returns {Promise<void>}
   */
  async load() {
    await this.load_transformers();
    this.loaded = true;
  }
  /**
   * Unload model and free resources
   * @returns {Promise<void>}
   */
  async unload() {
    if (this.pipeline) {
      if (this.pipeline.destroy) await this.pipeline.destroy();
      this.pipeline = null;
    }
    if (this.tokenizer) {
      this.tokenizer = null;
    }
    this.loaded = false;
  }
  /**
   * Initialize transformers pipeline and tokenizer
   * @private
   * @returns {Promise<void>}
   */
  async load_transformers() {
    const { pipeline, env, AutoTokenizer } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2");
    env.allowLocalModels = false;
    const pipeline_opts = {
      quantized: true
    };
    if (this.use_gpu) {
      console.log("[Transformers] Using GPU");
      pipeline_opts.device = "webgpu";
      pipeline_opts.dtype = "fp32";
    } else {
      console.log("[Transformers] Using CPU");
      env.backends.onnx.wasm.numThreads = 8;
    }
    this.pipeline = await pipeline("feature-extraction", this.model_key, pipeline_opts);
    this.tokenizer = await AutoTokenizer.from_pretrained(this.model_key);
  }
  /**
   * Count tokens in input text
   * @param {string} input - Text to tokenize
   * @returns {Promise<Object>} Token count result
   */
  async count_tokens(input) {
    if (!this.tokenizer) await this.load();
    const { input_ids } = await this.tokenizer(input);
    return { tokens: input_ids.data.length };
  }
  /**
   * Generate embeddings for multiple inputs
   * @param {Array<Object>} inputs - Array of input objects
   * @returns {Promise<Array<Object>>} Processed inputs with embeddings
   */
  async embed_batch(inputs) {
    if (!this.pipeline) await this.load();
    const filtered_inputs = inputs.filter((item) => item.embed_input?.length > 0);
    if (!filtered_inputs.length) return [];
    if (filtered_inputs.length > this.batch_size) {
      console.log(`Processing ${filtered_inputs.length} inputs in batches of ${this.batch_size}`);
      const results = [];
      for (let i = 0; i < filtered_inputs.length; i += this.batch_size) {
        const batch = filtered_inputs.slice(i, i + this.batch_size);
        const batch_results = await this._process_batch(batch);
        results.push(...batch_results);
      }
      return results;
    }
    return await this._process_batch(filtered_inputs);
  }
  /**
   * Process a single batch of inputs
   * @private
   * @param {Array<Object>} batch_inputs - Batch of inputs to process
   * @returns {Promise<Array<Object>>} Processed batch results
   */
  async _process_batch(batch_inputs) {
    const tokens = await Promise.all(batch_inputs.map((item) => this.count_tokens(item.embed_input)));
    const embed_inputs = await Promise.all(batch_inputs.map(async (item, i) => {
      if (tokens[i].tokens < this.max_tokens) return item.embed_input;
      let token_ct = tokens[i].tokens;
      let truncated_input = item.embed_input;
      while (token_ct > this.max_tokens) {
        const pct = this.max_tokens / token_ct;
        const max_chars = Math.floor(truncated_input.length * pct * 0.9);
        truncated_input = truncated_input.substring(0, max_chars) + "...";
        token_ct = (await this.count_tokens(truncated_input)).tokens;
      }
      tokens[i].tokens = token_ct;
      return truncated_input;
    }));
    try {
      const resp = await this.pipeline(embed_inputs, { pooling: "mean", normalize: true });
      return batch_inputs.map((item, i) => {
        item.vec = Array.from(resp[i].data).map((val) => Math.round(val * 1e8) / 1e8);
        item.tokens = tokens[i].tokens;
        return item;
      });
    } catch (err) {
      console.error("error_processing_batch", err);
      return Promise.all(batch_inputs.map(async (item) => {
        try {
          const result = await this.pipeline(item.embed_input, { pooling: "mean", normalize: true });
          item.vec = Array.from(result[0].data).map((val) => Math.round(val * 1e8) / 1e8);
          item.tokens = (await this.count_tokens(item.embed_input)).tokens;
          return item;
        } catch (single_err) {
          console.error("error_processing_single_item", single_err);
          return {
            ...item,
            vec: [],
            tokens: 0,
            error: single_err.message
          };
        }
      }));
    }
  }
  /** @returns {Object} Settings configuration for transformers adapter */
  get settings_config() {
    return transformers_settings_config;
  }
  /**
   * Get available models (hardcoded list)
   * @returns {Promise<Object>} Map of model objects
   */
  get_models() {
    return Promise.resolve(this.models);
  }
  get models() {
    return transformers_models;
  }
};
__publicField(SmartEmbedTransformersAdapter, "defaults", transformers_defaults);
var transformers_models = {
  "TaylorAI/bge-micro-v2": {
    "id": "TaylorAI/bge-micro-v2",
    "batch_size": 1,
    "dims": 384,
    "max_tokens": 512,
    "name": "BGE-micro-v2",
    "description": "Local, 512 tokens, 384 dim (recommended)",
    "adapter": "transformers"
  },
  "TaylorAI/gte-tiny": {
    "id": "TaylorAI/gte-tiny",
    "batch_size": 1,
    "dims": 384,
    "max_tokens": 512,
    "name": "GTE-tiny",
    "description": "Local, 512 tokens, 384 dim",
    "adapter": "transformers"
  },
  "Mihaiii/Ivysaur": {
    "id": "Mihaiii/Ivysaur",
    "batch_size": 1,
    "dims": 384,
    "max_tokens": 512,
    "name": "Ivysaur",
    "description": "Local, 512 tokens, 384 dim",
    "adapter": "transformers"
  },
  "andersonbcdefg/bge-small-4096": {
    "id": "andersonbcdefg/bge-small-4096",
    "batch_size": 1,
    "dims": 384,
    "max_tokens": 4096,
    "name": "BGE-small-4K",
    "description": "Local, 4,096 tokens, 384 dim",
    "adapter": "transformers"
  },
  "Xenova/jina-embeddings-v2-base-zh": {
    "id": "Xenova/jina-embeddings-v2-base-zh",
    "batch_size": 1,
    "dims": 512,
    "max_tokens": 8192,
    "name": "Jina-v2-base-zh-8K",
    "description": "Local, 8,192 tokens, 512 dim, Chinese/English bilingual",
    "adapter": "transformers"
  },
  "Xenova/jina-embeddings-v2-small-en": {
    "id": "Xenova/jina-embeddings-v2-small-en",
    "batch_size": 1,
    "dims": 512,
    "max_tokens": 8192,
    "name": "Jina-v2-small-en",
    "description": "Local, 8,192 tokens, 512 dim",
    "adapter": "transformers"
  },
  "nomic-ai/nomic-embed-text-v1.5": {
    "id": "nomic-ai/nomic-embed-text-v1.5",
    "batch_size": 1,
    "dims": 768,
    "max_tokens": 2048,
    "name": "Nomic-embed-text-v1.5",
    "description": "Local, 8,192 tokens, 768 dim",
    "adapter": "transformers"
  },
  "Xenova/bge-small-en-v1.5": {
    "id": "Xenova/bge-small-en-v1.5",
    "batch_size": 1,
    "dims": 384,
    "max_tokens": 512,
    "name": "BGE-small",
    "description": "Local, 512 tokens, 384 dim",
    "adapter": "transformers"
  },
  "nomic-ai/nomic-embed-text-v1": {
    "id": "nomic-ai/nomic-embed-text-v1",
    "batch_size": 1,
    "dims": 768,
    "max_tokens": 2048,
    "name": "Nomic-embed-text",
    "description": "Local, 2,048 tokens, 768 dim",
    "adapter": "transformers"
  }
};
var transformers_settings_config = {
  "[ADAPTER].gpu_batch_size": {
    name: "GPU Batch Size",
    type: "number",
    description: "Number of embeddings to process per batch on GPU. Use 0 to disable GPU.",
    placeholder: "Enter number ex. 10"
  },
  "[ADAPTER].legacy_transformers": {
    name: "Legacy Transformers (no GPU)",
    type: "toggle",
    description: "Use legacy transformers (v2) instead of v3.",
    callback: "embed_model_changed",
    default: true
  }
};

// build/transformers_worker_script.js
var model = null;
var processing_message = false;
async function process_message(data) {
  const { method, params, id, worker_id } = data;
  try {
    let result;
    switch (method) {
      case "load":
        console.log("load", params);
        if (!model) {
          model = new SmartEmbedModel({
            ...params,
            adapters: { transformers: SmartEmbedTransformersAdapter },
            adapter: "transformers",
            settings: {}
          });
          await model.load();
        }
        result = { model_loaded: true };
        break;
      case "embed_batch":
        if (!model) throw new Error("Model not loaded");
        if (processing_message) while (processing_message) await new Promise((resolve) => setTimeout(resolve, 100));
        processing_message = true;
        result = await model.embed_batch(params.inputs);
        processing_message = false;
        break;
      case "count_tokens":
        if (!model) throw new Error("Model not loaded");
        if (processing_message) while (processing_message) await new Promise((resolve) => setTimeout(resolve, 100));
        processing_message = true;
        result = await model.count_tokens(params);
        processing_message = false;
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    return { id, result, worker_id };
  } catch (error) {
    console.error("Error processing message:", error);
    return { id, error: error.message, worker_id };
  }
}
self.addEventListener("message", async (event) => {
  const response = await process_message(event.data);
  self.postMessage(response);
});
console.log("worker loaded");
self.process_message = process_message;
