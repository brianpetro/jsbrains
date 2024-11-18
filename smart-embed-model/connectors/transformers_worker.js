// ../smart-model/smart_model.js
var SmartModel = class {
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
    this.state = "unloaded";
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
    throw new Error("default_model_key must be overridden in sub-class");
  }
  /**
   * Get available models configuration
   * @returns {Object} Map of model configurations
   */
  get models() {
  }
  /**
   * Get the current model key
   * @returns {string} Current model key
   */
  get model_key() {
    return this.opts.model_key || this.settings.model_key || this.default_model_key;
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
  get settings() {
    return this.opts.settings;
  }
  async load() {
    this.set_state("loading");
    if (!this.adapter?.loaded) {
      await this.invoke_adapter_method("load");
    }
    this.set_state("loaded");
  }
  async unload() {
    if (this.adapter?.loaded) {
      this.set_state("unloading");
      await this.invoke_adapter_method("unload");
      this.set_state("unloaded");
    }
  }
  /**
   * Set the state of the SmartModel.
   * @param {string} new_state - The new state to set.
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
  // ADAPTERS
  /**
   * Get the map of available adapters
   * @returns {Object} Map of adapter names to adapter classes
   */
  get adapters() {
    return this.opts.adapters || {};
  }
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
      throw new Error("No adapter loaded.");
    }
    if (typeof this.adapter[method] !== "function") {
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
   * Process individual setting key for prefixes/variables
   * @param {string} key - Setting key to process
   * @returns {string} Processed setting key
   */
  process_setting_key(key) {
    return key;
  }
  // override in sub-class if needed for prefixes and variable replacements
};

// models.json
var models_default = {
  "TaylorAI/bge-micro-v2": {
    id: "TaylorAI/bge-micro-v2",
    batch_size: 1,
    dims: 384,
    max_tokens: 512,
    name: "BGE-micro-v2",
    description: "Local, 512 tokens, 384 dim",
    adapter: "transformers"
  },
  "andersonbcdefg/bge-small-4096": {
    id: "andersonbcdefg/bge-small-4096",
    batch_size: 1,
    dims: 384,
    max_tokens: 4096,
    name: "BGE-small-4K",
    description: "Local, 4,096 tokens, 384 dim",
    adapter: "transformers"
  },
  "Xenova/jina-embeddings-v2-base-zh": {
    id: "Xenova/jina-embeddings-v2-base-zh",
    batch_size: 1,
    dims: 512,
    max_tokens: 8192,
    name: "Jina-v2-base-zh-8K",
    description: "Local, 8,192 tokens, 512 dim, Chinese/English bilingual",
    adapter: "transformers"
  },
  "text-embedding-3-small": {
    id: "text-embedding-3-small",
    batch_size: 50,
    dims: 1536,
    max_tokens: 8191,
    name: "OpenAI Text-3 Small",
    description: "API, 8,191 tokens, 1,536 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "text-embedding-3-large": {
    id: "text-embedding-3-large",
    batch_size: 50,
    dims: 3072,
    max_tokens: 8191,
    name: "OpenAI Text-3 Large",
    description: "API, 8,191 tokens, 3,072 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "text-embedding-3-small-512": {
    id: "text-embedding-3-small",
    batch_size: 50,
    dims: 512,
    max_tokens: 8191,
    name: "OpenAI Text-3 Small - 512",
    description: "API, 8,191 tokens, 512 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "text-embedding-3-large-256": {
    id: "text-embedding-3-large",
    batch_size: 50,
    dims: 256,
    max_tokens: 8191,
    name: "OpenAI Text-3 Large - 256",
    description: "API, 8,191 tokens, 256 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "text-embedding-ada-002": {
    id: "text-embedding-ada-002",
    batch_size: 50,
    dims: 1536,
    max_tokens: 8191,
    name: "OpenAI Ada",
    description: "API, 8,191 tokens, 1,536 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "Xenova/jina-embeddings-v2-small-en": {
    id: "Xenova/jina-embeddings-v2-small-en",
    batch_size: 1,
    dims: 512,
    max_tokens: 8192,
    name: "Jina-v2-small-en",
    description: "Local, 8,192 tokens, 512 dim",
    adapter: "transformers"
  },
  "nomic-ai/nomic-embed-text-v1.5": {
    id: "nomic-ai/nomic-embed-text-v1.5",
    batch_size: 1,
    dims: 256,
    max_tokens: 8192,
    name: "Nomic-embed-text-v1.5",
    description: "Local, 8,192 tokens, 256 dim",
    adapter: "transformers"
  },
  "Xenova/bge-small-en-v1.5": {
    id: "Xenova/bge-small-en-v1.5",
    batch_size: 1,
    dims: 384,
    max_tokens: 512,
    name: "BGE-small",
    description: "Local, 512 tokens, 384 dim",
    adapter: "transformers"
  },
  "nomic-ai/nomic-embed-text-v1": {
    id: "nomic-ai/nomic-embed-text-v1",
    batch_size: 1,
    dims: 768,
    max_tokens: 2048,
    name: "Nomic-embed-text",
    description: "Local, 2,048 tokens, 768 dim",
    adapter: "transformers"
  }
};

// smart_embed_model.js
var SmartEmbedModel = class extends SmartModel {
  /**
   * Create a SmartEmbedModel instance
   * @param {Object} opts - Configuration options
   * @param {string} [opts.adapter] - Adapter identifier
   * @param {Object} [opts.adapters] - Available adapters
   * @param {boolean} [opts.use_gpu] - Enable GPU acceleration
   * @param {number} [opts.gpu_batch_size] - Batch size for GPU processing
   * @param {number} [opts.batch_size] - General batch size
   * @param {Object} [opts.model_config] - Model-specific configuration
   * @param {string} [opts.model_config.adapter] - Adapter to use (e.g. 'openai')
   * @param {number} [opts.model_config.dims] - Embedding dimensions
   * @param {number} [opts.model_config.max_tokens] - Maximum tokens to process
   */
  constructor(opts = {}) {
    super(opts);
  }
  /**
   * Count the number of tokens in the input string.
   * @param {string} input - The input string to process.
   * @returns {Promise<number>} A promise that resolves with the number of tokens.
   */
  async count_tokens(input) {
    return await this.invoke_adapter_method("count_tokens", input);
  }
  /**
   * Embed the input into a numerical array.
   * @param {string|Object} input - The input to embed. Can be a string or an object with an "embed_input" property.
   * @returns {Promise<Object>} A promise that resolves with an object containing the embedding vector at `vec` and the number of tokens at `tokens`.
   */
  async embed(input) {
    if (typeof input === "string") input = { embed_input: input };
    return (await this.embed_batch([input]))[0];
  }
  /**
   * Embed a batch of inputs into arrays of numerical arrays.
   * @param {Array<string|Object>} inputs - The array of inputs to embed. Each input can be a string or an object with an "embed_input" property.
   * @returns {Promise<Array<Object>>} A promise that resolves with an array of objects containing `vec` and `tokens` properties.
   */
  async embed_batch(inputs) {
    return await this.invoke_adapter_method("embed_batch", inputs);
  }
  /**
   * Get the current batch size
   * @returns {number} Batch size for processing
   */
  get batch_size() {
    return this.adapter.batch_size || 1;
  }
  get models() {
    return models_default;
  }
  get default_model_key() {
    return "TaylorAI/bge-micro-v2";
  }
  get settings_config() {
    const _settings_config = {
      model_key: {
        name: "Embedding Model",
        type: "dropdown",
        description: "Select an embedding model.",
        options_callback: "embed_model.get_embedding_model_options",
        callback: "embed_model_changed",
        default: "TaylorAI/bge-micro-v2"
        // required: true
      },
      "[EMBED_MODEL].min_chars": {
        name: "Minimum Embedding Length",
        type: "number",
        description: "Minimum length of note to embed.",
        placeholder: "Enter number ex. 300"
        // callback: 'refresh_embeddings',
        // required: true,
      },
      ...this.adapter.settings_config || {}
    };
    return this.process_settings_config(_settings_config, "embed_model");
  }
  process_setting_key(key) {
    return key.replace(/\[EMBED_MODEL\]/g, this.model_key);
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

// ../smart-model/adapters/_adapter.js
var SmartModelAdapter = class {
  constructor(model2) {
    this.model = model2;
    this.state = "unloaded";
  }
  async load() {
    this.set_state("loaded");
  }
  unload() {
    this.set_state("unloaded");
  }
  get model_key() {
    return this.model.model_key;
  }
  get model_config() {
    return this.model.model_config;
  }
  get settings() {
    return this.model.settings;
  }
  get model_settings() {
    return this.settings?.[this.model_key] || {};
  }
  /**
   * Set the state of the SmartModel.
   * @param {string} new_state - The new state to set.
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
  constructor(model2) {
    super(model2);
    this.smart_embed = model2;
  }
  async count_tokens(input) {
    throw new Error("count_tokens method not implemented");
  }
  async embed(input) {
    throw new Error("embed method not implemented");
  }
  async embed_batch(inputs) {
    throw new Error("embed_batch method not implemented");
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
    if (this.use_gpu && this.model_settings?.gpu_batch_size) return this.model_settings.gpu_batch_size;
    return this.model.opts.batch_size || this.model_config.batch_size || 1;
  }
};

// adapters/transformers.js
var SmartEmbedTransformersAdapter = class extends SmartEmbedAdapter {
  constructor(model2) {
    super(model2);
    this.pipeline = null;
    this.tokenizer = null;
  }
  async load() {
    await this.load_transformers();
    this.loaded = true;
  }
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
  async load_transformers() {
    const { pipeline, env, AutoTokenizer } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2");
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
  async count_tokens(input) {
    if (!this.tokenizer) await this.load();
    const { input_ids } = await this.tokenizer(input);
    return { tokens: input_ids.data.length };
  }
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
  get settings_config() {
    return transformers_settings_config;
  }
};
var transformers_settings_config = {
  "[EMBED_MODEL].gpu_batch_size": {
    name: "GPU Batch Size",
    type: "number",
    description: "Number of embeddings to process per batch on GPU. Use 0 to disable GPU.",
    placeholder: "Enter number ex. 10"
    // callback: 'restart',
  },
  "legacy_transformers": {
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
