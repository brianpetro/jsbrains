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

// smart_rank_model.js
var SmartRankModel = class extends SmartModel {
  /**
   * Load the SmartRankModel with the specified configuration.
   * @param {Object} env - Environment configurations.
   * @param {Object} opts - Configuration options.
   * @param {string} opts.model_key - Model key to select the adapter.
   * @param {Object} [opts.adapters] - Optional map of adapters to override defaults.
   * @param {Object} [opts.settings] - Optional user settings.
   * @returns {Promise<SmartRankModel>} Loaded SmartRankModel instance.
   * 
   * @example
   * ```javascript
   * const rankModel = await SmartRankModel.load(env, {
   *   model_key: 'cohere',
   *   adapter: 'cohere',
   *   settings: {
   *     cohere_api_key: 'your-cohere-api-key',
   *   },
   * });
   * ```
   */
  /**
   * Rank documents based on a query.
   * @param {string} query - The query string.
   * @param {Array<string>} documents - Array of document strings to rank.
   * @param {Object} [options={}] - Additional ranking options.
   * @param {number} [options.top_k] - Limit the number of returned documents.
   * @param {boolean} [options.return_documents=false] - Whether to include original documents in results.
   * @returns {Promise<Array<Object>>} Ranked documents with properties like {index, score, text}.
   * 
   * @example
   * ```javascript
   * const rankings = await rankModel.rank("What is the capital of the United States?", [
   *   "Carson City is the capital city of the American state of Nevada.",
   *   "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
   *   "Washington, D.C. is the capital of the United States.",
   * ]);
   * console.log(rankings);
   * ```
   */
  async rank(query, documents, options = {}) {
    return await this.invoke_adapter_method("rank", query, documents, options);
  }
  /**
   * Get the default model key.
   * @returns {string} Default model key.
   */
  get default_model_key() {
    return "jinaai/jina-reranker-v1-tiny-en";
  }
  /**
   * Get settings configuration schema.
   * @returns {Object} Settings configuration object.
   */
  get settings_config() {
    const _settings_config = {
      adapter: {
        name: "Ranking Model Platform",
        type: "dropdown",
        description: "Select a ranking model platform.",
        options_callback: "get_platforms_as_options",
        callback: "adapter_changed",
        default: this.constructor.defaults.adapter
      },
      // Add adapter-specific settings here
      ...this.adapter.settings_config || {}
    };
    return this.process_settings_config(_settings_config);
  }
};
/**
 * Default configurations for SmartRankModel.
 * @type {Object}
 */
__publicField(SmartRankModel, "defaults", {
  adapter: "cohere",
  model_key: "rerank-v3.5"
  // LOCAL RERANKER CURRENTLY TOO SLOW FOR DEFAULT
  // adapter: 'transformers', // Default to transformers adapter
  // model_key: 'jinaai/jina-reranker-v1-tiny-en',
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
var settings_config = {
  "[ADAPTER].model_key": {
    name: "Ranking Model",
    type: "dropdown",
    description: "Select a ranking model to use.",
    options_callback: "adapter.get_models_as_options",
    callback: "reload_model"
  }
};
var SmartRankAdapter = class extends SmartModelAdapter {
  /**
   * Create a SmartRankAdapter instance.
   * @param {SmartRankModel} model - The parent SmartRankModel instance
   */
  constructor(model2) {
    super(model2);
    this.smart_rank = model2;
  }
  /**
   * Rank documents based on a query.
   * @abstract
   * @param {string} query - The query string
   * @param {Array<string>} documents - The documents to rank
   * @returns {Promise<Array<Object>>} Array of ranking results {index, score, ...}
   * @throws {Error} If the method is not implemented by subclass
   */
  async rank(query, documents) {
    throw new Error("rank method not implemented");
  }
  get settings_config() {
    return settings_config;
  }
};

// adapters/transformers.js
var transformers_defaults = {
  adapter: "transformers",
  description: "Transformers",
  default_model: "jinaai/jina-reranker-v1-tiny-en"
};
var transformers_models = {
  "jinaai/jina-reranker-v1-tiny-en": {
    id: "jinaai/jina-reranker-v1-tiny-en",
    adapter: "transformers",
    model_key: "jinaai/jina-reranker-v1-tiny-en"
  },
  "jinaai/jina-reranker-v1-turbo-en": {
    id: "jinaai/jina-reranker-v1-turbo-en",
    adapter: "transformers",
    model_key: "jinaai/jina-reranker-v1-turbo-en"
  },
  "mixedbread-ai/mxbai-rerank-xsmall-v1": {
    id: "mixedbread-ai/mxbai-rerank-xsmall-v1",
    adapter: "transformers",
    model_key: "mixedbread-ai/mxbai-rerank-xsmall-v1"
  },
  "Xenova/bge-reranker-base": {
    id: "Xenova/bge-reranker-base",
    adapter: "transformers",
    model_key: "Xenova/bge-reranker-base"
  }
};
var transformers_settings_config = {
  use_gpu: {
    setting: "use_gpu",
    name: "Use GPU",
    description: "Use GPU for ranking (faster, may not work on all systems)",
    type: "toggle",
    default: true
  }
};
var SmartRankTransformersAdapter = class extends SmartRankAdapter {
  /**
   * Create transformers adapter instance
   * @param {SmartRankModel} model - Parent model instance
   */
  constructor(model2) {
    super(model2);
    this.model_instance = null;
    this.tokenizer = null;
  }
  /**
   * Load model and tokenizer
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    console.log("TransformersAdapter initializing");
    console.log(this.model.model_key);
    const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.0");
    env.allowLocalModels = false;
    const pipeline_opts = {
      quantized: true
    };
    if (this.model.opts.use_gpu) {
      console.log("[Transformers] Using GPU");
      pipeline_opts.device = "webgpu";
    } else {
      console.log("[Transformers] Using CPU");
    }
    this.tokenizer = await AutoTokenizer.from_pretrained(this.model.model_key);
    this.model_instance = await AutoModelForSequenceClassification.from_pretrained(this.model.model_key, pipeline_opts);
    console.log("TransformersAdapter initialized", this.model.model_key);
    this.model.model_loaded = true;
    this.set_state("loaded");
  }
  /**
   * Rank documents based on a query
   * @param {string} query - The query string
   * @param {Array<string>} documents - Documents to rank
   * @param {Object} [options={}] - Additional ranking options
   * @param {number} [options.top_k] - Limit the number of returned documents
   * @param {boolean} [options.return_documents=false] - Whether to include original documents in results
   * @returns {Promise<Array<Object>>} Ranked documents: [{index, score, text?}, ...]
   */
  async rank(query, documents, options = {}) {
    console.log("TransformersAdapter ranking");
    if (!this.model_instance || !this.tokenizer) {
      await this.load();
    }
    const { top_k = void 0, return_documents = false } = options;
    console.log("tokenizing", query, documents);
    const inputs = this.tokenizer(
      new Array(documents.length).fill(query),
      { text_pair: documents, padding: true, truncation: true }
    );
    console.log("inputs", inputs);
    const { logits } = await this.model_instance(inputs);
    console.log("done", logits);
    console.log("logits.data", logits.data);
    const results = logits.sigmoid().tolist().map(([score], i) => ({
      index: i,
      score,
      ...return_documents ? { text: documents[i] } : {}
    })).sort((a, b) => b.score - a.score).slice(0, top_k);
    console.log(results);
    return results;
  }
  get models() {
    return transformers_models;
  }
  get settings_config() {
    return {
      ...super.settings_config || {},
      ...transformers_settings_config
    };
  }
};
__publicField(SmartRankTransformersAdapter, "defaults", transformers_defaults);

// build/transformers_worker_script.js
var model = null;
async function process_message(data) {
  const { method, params, id, worker_id } = data;
  try {
    let result;
    switch (method) {
      case "load":
        console.log("load", params);
        if (!model) {
          model = new SmartRankModel({
            ...params,
            adapters: { transformers: SmartRankTransformersAdapter },
            adapter: "transformers",
            settings: {}
          });
          await model.load();
        }
        result = { model_loaded: true };
        break;
      case "rank":
        if (!model) throw new Error("Model not loaded");
        result = await model.rank(params.query, params.documents);
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
