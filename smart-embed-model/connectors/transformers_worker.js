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
   * @param {string} [opts.model_key] - Optional model identifier to override settings
   * @throws {Error} If required options are missing
   */
  constructor(opts = {}) {
    __publicField(this, "scope_name", "smart_model");
    this.opts = opts;
    this.validate_opts(opts);
    this.state = "unloaded";
    this._adapter = null;
    this.data = opts;
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
    let adapter_key = this.opts.adapter || this.settings.adapter || Object.keys(this.adapters)[0];
    if (!adapter_key || !this.adapters[adapter_key]) {
      console.warn(`Platform "${adapter_key}" not supported`);
      adapter_key = Object.keys(this.adapters)[0];
    }
    return adapter_key;
  }
  /**
   * Get available models.
   * @returns {Object} Map of model objects
   */
  get models() {
    return this.adapter.models;
  }
  /**
   * Get default model key.
   * @returns {string} Default model key
   */
  get default_model_key() {
    return this.adapter.constructor.defaults.default_model;
  }
  /**
   * Get the current model key
   * @returns {string} Current model key
   */
  get model_key() {
    return this.opts.model_key || this.settings.model_key || this.default_model_key;
  }
  /**
   * Load the current adapter and transition to loaded state.
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    this.set_state("loading");
    try {
      if (!this.adapter?.is_loaded) {
        await this.invoke_adapter_method("load");
      }
    } catch (err) {
      this.set_state("unloaded");
      if (!this.reload_model_timeout) {
        this.reload_model_timeout = setTimeout(async () => {
          this.reload_model_timeout = null;
          await this.load();
          this.set_state("loaded");
          this.env?.events?.emit("model:loaded", { model_key: this.model_key });
          this.notices?.show("Loaded model: " + this.model_key);
        }, 6e4);
      }
      throw new Error(`Failed to load model: ${err.message}`);
    }
    this.set_state("loaded");
  }
  /**
   * Unload the current adapter and transition to unloaded state.
   * @async
   * @returns {Promise<void>}
   */
  async unload() {
    if (this.adapter?.is_loaded) {
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
    if (typeof this.opts.re_render_settings === "function") this.opts.re_render_settings();
    else console.warn("re_render_settings is not a function (must be passed in model opts)");
  }
  /**
   * Reload model.
   */
  reload_model() {
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
   * @param {number} [opts.batch_size] - Default batch size for processing
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
        name: "Embedding model platform",
        type: "dropdown",
        description: "Select an embedding model platform. The default 'transformers' utilizes built-in local models.",
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
  // /**
  //  * Get embedding model options including 'None' option
  //  * @returns {Array<Object>} Array of model options with value and name
  //  */
  // get_block_embedding_model_options() {
  //   const options = this.get_embedding_model_options();
  //   options.unshift({ value: 'None', name: 'None' });
  //   return options;
  // }
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
   * Get the models.
   * @returns {Object} Map of model objects
   */
  get models() {
    const models = this.model.data.provider_models;
    if (typeof models === "object" && Object.keys(models || {}).length > 0) return models;
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
   * Get available models as dropdown options synchronously.
   * @returns {Array<Object>} Array of model options.
   */
  get_models_as_options() {
    const models = this.models;
    if (!Object.keys(models || {}).length) {
      this.get_models(true);
      return [{ value: "", name: "No models currently available" }];
    }
    return Object.entries(models).map(([id, model2]) => ({ value: id, name: model2.name || id })).sort((a, b) => a.name.localeCompare(b.name));
  }
  /**
   * Set the adapter's state.
   * @deprecated should be handled in SmartModel (only handle once)
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
    if (typeof input === "string") input = { embed_input: input };
    return (await this.embed_batch([input]))[0];
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
        name: "Embedding model",
        type: "dropdown",
        description: "Select an embedding model.",
        options_callback: "adapter.get_models_as_options",
        callback: "model_changed",
        default: this.constructor.defaults.default_model
      }
    };
  }
  get dims() {
    return this.model.data.dims;
  }
  get max_tokens() {
    return this.model.data.max_tokens;
  }
  get batch_size() {
    return this.model.data.batch_size || 1;
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
  default_model: "TaylorAI/bge-micro-v2",
  models: transformers_models
};
var DEVICE_CONFIGS = {
  // // WebGPU: high quality first
  webgpu_fp16: {
    device: "webgpu",
    dtype: "fp16",
    quantized: false
  },
  webgpu_fp32: {
    device: "webgpu",
    dtype: "fp32",
    quantized: false
  },
  // WebGPU: quantized tiers
  webgpu_q8: {
    device: "webgpu",
    dtype: "q8",
    quantized: true
  },
  webgpu_q4: {
    device: "webgpu",
    dtype: "q4",
    quantized: true
  },
  // Optional, if you use it
  webgpu_q4f16: {
    device: "webgpu",
    dtype: "q4f16",
    quantized: true
  },
  webgpu_bnb4: {
    device: "webgpu",
    dtype: "bnb4",
    quantized: true
  },
  // WASM: quantized CPU
  wasm_q8: {
    dtype: "q8",
    quantized: true
  },
  wasm_q4: {
    dtype: "q4",
    quantized: true
  },
  // Final universal fallback: WASM CPU, dtype = auto
  wasm_auto: {
    // NOTE: leaving out device to avoid Linux issues with 'wasm'
    // transformers.js will pick CPU/WASM backend itself
    quantized: false
  }
};
var is_webgpu_available = async () => {
  if (!("gpu" in navigator)) return false;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return false;
  return true;
};
var SmartEmbedTransformersAdapter = class extends SmartEmbedAdapter {
  /**
   * @param {import("../smart_embed_model.js").SmartEmbedModel} model
   */
  constructor(model2) {
    super(model2);
    this.pipeline = null;
    this.tokenizer = null;
    this.active_config_key = null;
    this.has_gpu = false;
  }
  /**
   * Load the underlying transformers pipeline with WebGPU → WASM fallback.
   * @returns {Promise<void>}
   */
  async load() {
    this.has_gpu = await is_webgpu_available();
    try {
      if (this.loading) {
        console.warn("[Transformers v2] load already in progress, waiting...");
        while (this.loading) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } else {
        this.loading = true;
        if (this.pipeline) {
          this.loaded = true;
          this.loading = false;
          return;
        }
        await this.load_transformers_with_fallback();
        this.loading = false;
        this.loaded = true;
        console.log(`[Transformers v2] model loaded using ${this.active_config_key}`, this);
      }
    } catch (e) {
      this.loading = false;
      this.loaded = false;
      console.error("[Transformers v2] load failed", e);
      throw e;
    }
  }
  /**
   * Unload the pipeline and free resources.
   * @returns {Promise<void>}
   */
  async unload() {
    try {
      if (this.pipeline) {
        if (typeof this.pipeline.destroy === "function") {
          this.pipeline.destroy();
        } else if (typeof this.pipeline.dispose === "function") {
          this.pipeline.dispose();
        }
      }
    } catch (err) {
      console.warn("[Transformers v2] error while disposing pipeline", err);
    }
    this.pipeline = null;
    this.tokenizer = null;
    this.active_config_key = null;
    this.loaded = false;
  }
  /**
   * Available models – reuses the v1 transformers model catalog.
   * @returns {Object}
   */
  get models() {
    return transformers_models;
  }
  /**
   * Maximum tokens per input.
   * @returns {number}
   */
  get max_tokens() {
    return this.model.data.max_tokens || 512;
  }
  /**
   * Effective batch size.
   * Prefers small deterministic batches when not explicitly configured.
   * @returns {number}
   */
  get batch_size() {
    const configured = this.model.data.batch_size;
    if (configured && configured > 0) return configured;
    return this.gpu_enabled ? 16 : 8;
  }
  get gpu_enabled() {
    if (this.has_gpu) {
      const explicit = typeof this.model.data.use_gpu === "boolean" ? this.model.data.use_gpu : null;
      if (explicit === false) return false;
      return true;
    } else {
      return false;
    }
  }
  /**
   * Initialize transformers pipeline with WebGPU → WASM fallback.
   * @private
   * @returns {Promise<void>}
   */
  async load_transformers_with_fallback() {
    const { pipeline, env, AutoTokenizer } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.0");
    env.allowLocalModels = false;
    if (typeof env.useBrowserCache !== "undefined") {
      env.useBrowserCache = true;
    }
    let last_error = null;
    const CONFIG_LIST_ORDER = Object.keys(DEVICE_CONFIGS);
    const try_create = async (config_key) => {
      const pipe = await pipeline("feature-extraction", this.model_key, DEVICE_CONFIGS[config_key]);
      return pipe;
    };
    for (const config of CONFIG_LIST_ORDER) {
      if (this.pipeline) break;
      if (config.includes("gpu") && !this.gpu_enabled) {
        console.warn(`[Transformers v2: ${config}] skipping ${config} as GPU is disabled`);
        continue;
      }
      try {
        console.log(`[Transformers v2] trying to load pipeline on ${config}`);
        this.pipeline = await try_create(config);
        this.active_config_key = config;
        break;
      } catch (err) {
        console.warn(`[Transformers v2: ${config}] failed to load pipeline on ${config}`, err);
        last_error = err;
      }
    }
    if (this.pipeline) {
      console.log(`[Transformers v2: ${this.active_config_key}] pipeline initialized using ${this.active_config_key}`);
    } else {
      throw last_error || new Error("Failed to initialize transformers pipeline");
    }
    this.tokenizer = await AutoTokenizer.from_pretrained(this.model_key);
  }
  /**
   * Count tokens in input text.
   * @param {string} input
   * @returns {Promise<{tokens:number}>}
   */
  async count_tokens(input) {
    if (!this.tokenizer) {
      await this.load();
    }
    const { input_ids } = await this.tokenizer(input);
    return { tokens: input_ids.data.length };
  }
  /**
   * Generate embeddings for multiple inputs.
   * @param {Array<Object>} inputs
   * @returns {Promise<Array<Object>>}
   */
  async embed_batch(inputs) {
    if (!this.pipeline) {
      await this.load();
    }
    const filtered_inputs = inputs.filter((item) => item.embed_input && item.embed_input.length > 0);
    if (!filtered_inputs.length) return [];
    const results = [];
    for (let i = 0; i < filtered_inputs.length; i += this.batch_size) {
      const batch = filtered_inputs.slice(i, i + this.batch_size);
      const batch_results = await this._process_batch(batch);
      results.push(...batch_results);
    }
    return results;
  }
  /**
   * Process a single batch – with per-item retry on failure.
   * @private
   * @param {Array<Object>} batch_inputs
   * @returns {Promise<Array<Object>>}
   */
  async _process_batch(batch_inputs) {
    const prepared = await Promise.all(
      batch_inputs.map((item) => this._prepare_input(item.embed_input))
    );
    const embed_inputs = prepared.map((p) => p.text);
    const tokens = prepared.map((p) => p.tokens);
    try {
      const resp = await this.pipeline(embed_inputs, { pooling: "mean", normalize: true });
      return batch_inputs.map((item, i) => {
        const vec = Array.from(resp[i].data).map((val) => Math.round(val * 1e8) / 1e8);
        item.vec = vec;
        item.tokens = tokens[i];
        return item;
      });
    } catch (err) {
      console.error("[Transformers v2] batch embed failed \u2013 retrying items individually", err);
      return await this._retry_items_individually(batch_inputs);
    }
  }
  /**
   * Prepare a single input by truncating to max_tokens if necessary.
   * @private
   * @param {string} embed_input
   * @returns {Promise<{text:string,tokens:number}>}
   */
  async _prepare_input(embed_input) {
    let { tokens } = await this.count_tokens(embed_input);
    if (tokens <= this.max_tokens) {
      return { text: embed_input, tokens };
    }
    let truncated = embed_input;
    while (tokens > this.max_tokens && truncated.length > 0) {
      const pct = this.max_tokens / tokens;
      const max_chars = Math.floor(truncated.length * pct * 0.9);
      truncated = truncated.slice(0, max_chars);
      const last_space = truncated.lastIndexOf(" ");
      if (last_space > 0) {
        truncated = truncated.slice(0, last_space);
      }
      tokens = (await this.count_tokens(truncated)).tokens;
    }
    return { text: truncated, tokens };
  }
  /**
   * Retry each item individually after a batch failure.
   * @private
   * @param {Array<Object>} batch_inputs
   * @returns {Promise<Array<Object>>}
   */
  async _retry_items_individually(batch_inputs) {
    await this._reset_pipeline_after_error();
    const results = [];
    for (const item of batch_inputs) {
      try {
        const prepared = await this._prepare_input(item.embed_input);
        const resp = await this.pipeline(prepared.text, { pooling: "mean", normalize: true });
        const vec = Array.from(resp[0].data).map((val) => Math.round(val * 1e8) / 1e8);
        results.push({
          ...item,
          vec,
          tokens: prepared.tokens
        });
      } catch (single_err) {
        console.error("[Transformers v2] single item embed failed \u2013 skipping", single_err);
        results.push({
          ...item,
          vec: [],
          tokens: 0,
          error: single_err.message
        });
      }
    }
    return results;
  }
  /**
   * Reset pipeline after a failure – falling back to WASM if needed.
   * @private
   * @returns {Promise<void>}
   */
  async _reset_pipeline_after_error() {
    try {
      if (this.pipeline) {
        if (typeof this.pipeline.destroy === "function") {
          this.pipeline.destroy();
        } else if (typeof this.pipeline.dispose === "function") {
          this.pipeline.dispose();
        }
      }
    } catch (err) {
      console.warn("[Transformers v2] error while resetting pipeline", err);
    }
    this.pipeline = null;
    await this.load_transformers_with_fallback();
  }
  /**
   * V2 intentionally exposes only model selection in the settings UI.
   * @returns {Object}
   */
  get settings_config() {
    return super.settings_config;
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
  "Snowflake/snowflake-arctic-embed-xs": {
    "id": "Snowflake/snowflake-arctic-embed-xs",
    "batch_size": 1,
    "dims": 384,
    "max_tokens": 512,
    "name": "Snowflake Arctic Embed XS",
    "description": "Local, 512 tokens, 384 dim",
    "adapter": "transformers"
  },
  "Snowflake/snowflake-arctic-embed-s": {
    "id": "Snowflake/snowflake-arctic-embed-s",
    "batch_size": 1,
    "dims": 384,
    "max_tokens": 512,
    "name": "Snowflake Arctic Embed Small",
    "description": "Local, 512 tokens, 384 dim",
    "adapter": "transformers"
  },
  "Snowflake/snowflake-arctic-embed-m": {
    "id": "Snowflake/snowflake-arctic-embed-m",
    "batch_size": 1,
    "dims": 768,
    "max_tokens": 512,
    "name": "Snowflake Arctic Embed Medium",
    "description": "Local, 512 tokens, 768 dim",
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
  "onnx-community/embeddinggemma-300m-ONNX": {
    "id": "onnx-community/embeddinggemma-300m-ONNX",
    "batch_size": 1,
    "dims": 768,
    "max_tokens": 2048,
    "name": "EmbeddingGemma-300M",
    "description": "Local, 2,048 tokens, 768 dim",
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
  // Too slow and persistent crashes
  // "jinaai/jina-embeddings-v2-base-de": {
  //   "id": "jinaai/jina-embeddings-v2-base-de",
  //   "batch_size": 1,
  //   "dims": 768,
  //   "max_tokens": 4096,
  //   "name": "jina-embeddings-v2-base-de",
  //   "description": "Local, 4,096 tokens, 768 dim, German",
  //   "adapter": "transformers"
  // },
  "Xenova/jina-embeddings-v2-base-zh": {
    "id": "Xenova/jina-embeddings-v2-base-zh",
    "batch_size": 1,
    "dims": 768,
    "max_tokens": 8192,
    "name": "Jina-v2-base-zh-8K",
    "description": "Local, 8,192 tokens, 768 dim, Chinese/English bilingual",
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
      case "unload":
        console.log("unload", params);
        if (model) {
          await model.unload();
          model = null;
        }
        result = { model_unloaded: true };
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
