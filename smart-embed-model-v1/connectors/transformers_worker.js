// ../smart-model/smart_model.js
var SmartModel = class {
  constructor(opts = {}) {
    this.opts = opts;
  }
  get settings_config() {
    return this.process_settings_config({
      // SETTINGS GO HERE
    });
  }
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
   * Create a SmartEmbed instance.
   * @param {string} env - The environment to use.
   * @param {object} opts - Full model configuration object or at least a model_key and adapter
   */
  constructor(env, opts = {}) {
    super(opts);
    if (this.opts.model_key === "None") return console.log(`Smart Embed Model: No active embedding model for ${this.collection_key}, skipping embedding`);
    this.env = env;
    this.opts = {
      ...this.env.opts.modules.smart_embed_model?.class ? { ...this.env.opts.modules.smart_embed_model, class: null } : {},
      ...models_default[opts.model_key],
      // ewww gross
      ...opts
    };
    if (!this.opts.adapter) return console.warn("SmartEmbedModel adapter not set");
    if (!this.opts.adapters[this.opts.adapter]) return console.warn(`SmartEmbedModel adapter ${this.opts.adapter} not found`);
    this.opts.use_gpu = typeof navigator !== "undefined" && !!navigator?.gpu && this.opts.gpu_batch_size !== 0;
    if (this.opts.adapter === "transformers" && this.opts.use_gpu) this.opts.batch_size = this.opts.gpu_batch_size || 10;
  }
  get adapters() {
    return this.opts.adapters || this.env.opts.modules.smart_embed_model.adapters;
  }
  get adapter() {
    if (!this._adapter) this._adapter = new this.adapters[this.opts.adapter](this);
    return this._adapter;
  }
  async load() {
    this.loading = true;
    await this.adapter.load();
    this.loading = false;
    this.loaded = true;
  }
  async unload() {
    await this.adapter.unload();
  }
  /**
   * Count the number of tokens in the input string.
   * @param {string} input - The input string to process.
   * @returns {Promise<number>} A promise that resolves with the number of tokens.
   */
  async count_tokens(input) {
    return this.adapter.count_tokens(input);
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
    return await this.adapter.embed_batch(inputs);
  }
  get model_config() {
    return models_default[this.opts.model_key];
  }
  get batch_size() {
    return this.opts.batch_size || 1;
  }
  get max_tokens() {
    return this.opts.max_tokens || 512;
  }
  get dims() {
    return this.opts.dims;
  }
  get min_chars() {
    return this.settings?.[this.opts.model_key]?.min_chars || 300;
  }
  // TODO: replace static opts with dynamic reference to canonical settings via opts.settings (like smart-chat-model-v2)
  get settings() {
    return this.opts.settings;
  }
  // ref to canonical settings
  get settings_config() {
    return this.process_settings_config(settings_config, "embed_model");
  }
  process_setting_key(key) {
    return key.replace(/\[EMBED_MODEL\]/g, this.opts.model_key);
  }
  get_embedding_model_options() {
    return Object.entries(models_default).map(([key, model2]) => ({ value: key, name: key }));
  }
  get_block_embedding_model_options() {
    const options = this.get_embedding_model_options();
    options.unshift({ value: "None", name: "None" });
    return options;
  }
};
var settings_config = {
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
  "[EMBED_MODEL].api_key": {
    name: "OpenAI API Key for embeddings",
    type: "password",
    description: "Required for OpenAI embedding models",
    placeholder: "Enter OpenAI API Key",
    // callback: 'test_api_key_openai_embeddings',
    // callback: 'restart', // TODO: should be replaced with better unload/reload of smart_embed
    conditional: (_this) => !_this.settings.model_key?.includes("/")
  },
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

// adapters/_adapter.js
var SmartEmbedAdapter = class {
  constructor(smart_embed) {
    this.smart_embed = smart_embed;
  }
  async load() {
    throw new Error("Not implemented");
  }
  async count_tokens(input) {
    throw new Error("Not implemented");
  }
  async embed(input) {
    throw new Error("Not implemented");
  }
  async embed_batch(input) {
    throw new Error("Not implemented");
  }
  unload() {
  }
};

// adapters/transformers.js
var SmartEmbedTransformersAdapter = class extends SmartEmbedAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.model = null;
    this.tokenizer = null;
  }
  get batch_size() {
    if (this.use_gpu && this.smart_embed.opts.gpu_batch_size) return this.smart_embed.opts.gpu_batch_size;
    return this.smart_embed.opts.batch_size || 1;
  }
  get max_tokens() {
    return this.smart_embed.opts.max_tokens || 512;
  }
  get use_gpu() {
    return this.smart_embed.opts.use_gpu || false;
  }
  async load() {
    const { pipeline, env, AutoTokenizer } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0");
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
    this.model = await pipeline("feature-extraction", this.smart_embed.opts.model_key, pipeline_opts);
    this.tokenizer = await AutoTokenizer.from_pretrained(this.smart_embed.opts.model_key);
  }
  async count_tokens(input) {
    if (!this.tokenizer) await this.load();
    const { input_ids } = await this.tokenizer(input);
    return { tokens: input_ids.data.length };
  }
  async embed_batch(inputs) {
    if (!this.model) await this.load();
    const filtered_inputs = inputs.filter((item) => item.embed_input?.length > 0);
    if (!filtered_inputs.length) return [];
    if (filtered_inputs.length > this.batch_size) {
      throw new Error(`Input size (${filtered_inputs.length}) exceeds maximum batch size (${this.batch_size})`);
    }
    const tokens = await Promise.all(filtered_inputs.map((item) => this.count_tokens(item.embed_input)));
    const embed_inputs = await Promise.all(filtered_inputs.map(async (item, i) => {
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
      const resp = await this.model(embed_inputs, { pooling: "mean", normalize: true });
      return filtered_inputs.map((item, i) => {
        item.vec = Array.from(resp[i].data).map((val) => Math.round(val * 1e8) / 1e8);
        item.tokens = tokens[i].tokens;
        return item;
      });
    } catch (err) {
      console.error("error_embedding_batch", err);
      return Promise.all(filtered_inputs.map((item) => this.embed(item.embed_input)));
    }
  }
  async unload() {
    await this.model.dispose();
  }
};

// build/transformers_worker_script.js
var model = null;
var smart_env = {
  smart_embed_active_models: {},
  opts: {
    modules: {
      smart_embed_model: {
        adapters: {
          transformers: SmartEmbedTransformersAdapter
        }
      }
    }
  }
};
var processing_message = false;
async function process_message(data) {
  const { method, params, id, worker_id } = data;
  try {
    let result;
    switch (method) {
      case "load":
        console.log("load", params);
        if (!model) {
          model = new SmartEmbedModel(smart_env, { ...params, adapters: { transformers: SmartEmbedTransformersAdapter }, adapter: "transformers" });
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
      case "unload":
        await model.unload();
        result = { unloaded: true };
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
