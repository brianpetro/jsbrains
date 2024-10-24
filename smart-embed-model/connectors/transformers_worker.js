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

// ../smart-http-request/smart_http_request.js
var SmartHttpRequest = class {
  /**
   * @param {object} opts - Options for the SmartHttpRequest class
   * @param {SmartHttpRequestAdapter} opts.adapter - The adapter constructor to use for making HTTP requests
   * @param {Obsidian.requestUrl} opts.obsidian_request_adapter - For use with Obsidian adapter
   */
  constructor(opts = {}) {
    this.opts = opts;
    if (!opts.adapter) throw new Error("HttpRequestAdapter is required");
    this.adapter = new opts.adapter(this);
  }
  /**
   * Returns a well-formed response object
   * @param {object} request_params - Parameters for the HTTP request
   * @param {string} request_params.url - The URL to make the request to
   * @param {string} [request_params.method='GET'] - The HTTP method to use
   * @param {object} [request_params.headers] - Headers to include in the request
   * @param {*} [request_params.body] - The body of the request (for POST, PUT, etc.)
   * @returns {SmartHttpResponseAdapter} instance of the SmartHttpResponseAdapter class
   * @example
   * const response = await smart_http_request.request({
   *   url: 'https://api.example.com/data',
   *   method: 'GET',
   *   headers: { 'Content-Type': 'application/json' }
   * });
   * console.log(await response.json());
   */
  async request(request_params) {
    return await this.adapter.request(request_params);
  }
};

// smart_embed_model.js
var SmartEmbedModel = class extends SmartModel {
  /**
   * Create a SmartEmbedModel instance.
   * @param {object} opts - Options for the model, including settings.
   */
  constructor(opts = {}) {
    super(opts);
    this._adapters = {};
    this._http_adapter = null;
    this.opts = {
      ...models_default[opts.settings?.model_key],
      ...opts
    };
    if (!this.opts.adapter) return console.warn("SmartEmbedModel adapter not set");
    if (!this.opts.adapters[this.opts.adapter]) return console.warn(`SmartEmbedModel adapter ${this.opts.adapter} not found`);
    this.opts.use_gpu = !!navigator?.gpu && this.opts.gpu_batch_size !== 0;
    if (this.opts.adapter === "transformers" && this.opts.use_gpu) this.opts.batch_size = this.opts.gpu_batch_size || 10;
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
  get batch_size() {
    return this.opts.batch_size || 1;
  }
  get max_tokens() {
    return this.opts.max_tokens || 512;
  }
  get dims() {
    return this.opts.dims;
  }
  get model_config() {
    return models_default[this.model_key];
  }
  get settings() {
    return this.opts.settings;
  }
  get adapter_key() {
    return this.model_config.adapter;
  }
  get model_key() {
    return this.opts.model_key || this.settings.model_key;
  }
  get adapters() {
    return this.opts.adapters;
  }
  get adapter() {
    if (!this._adapters[this.adapter_key]) {
      this._adapters[this.adapter_key] = new this.adapters[this.adapter_key](this);
    }
    return this._adapters[this.adapter_key];
  }
  get http_adapter() {
    if (!this._http_adapter) {
      if (this.opts.http_adapter) this._http_adapter = this.opts.http_adapter;
      else this._http_adapter = new SmartHttpRequest();
    }
    return this._http_adapter;
  }
  get settings_config() {
    const _settings_config = {
      model_key: {
        name: "Embedding Model",
        type: "dropdown",
        description: "Select an embedding model.",
        options_callback: "get_embedding_model_options",
        callback: "embed_model_changed",
        default: "TaylorAI/bge-micro-v2"
      },
      "[EMBED_MODEL].min_chars": {
        name: "Minimum Embedding Length",
        type: "number",
        description: "Minimum length of note to embed.",
        placeholder: "Enter number ex. 300"
      },
      "[EMBED_MODEL].api_key": {
        name: "OpenAI API Key for embeddings",
        type: "password",
        description: "Required for OpenAI embedding models",
        placeholder: "Enter OpenAI API Key",
        callback: "restart",
        conditional: (_this) => !_this.settings.model_key?.includes("/")
      },
      "[EMBED_MODEL].gpu_batch_size": {
        name: "GPU Batch Size",
        type: "number",
        description: "Number of embeddings to process per batch on GPU. Use 0 to disable GPU.",
        placeholder: "Enter number ex. 10",
        callback: "restart"
      },
      ...this.adapter.settings_config || {}
    };
    return this.process_settings_config(_settings_config);
  }
  process_setting_key(key) {
    return key.replace(/\[EMBED_MODEL\]/g, this.settings.model_key);
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

// adapters/_adapter.js
var SmartEmbedAdapter = class {
  constructor(smart_embed) {
    this.smart_embed = smart_embed;
    this.settings = smart_embed.settings;
    this.model_config = smart_embed.model_config;
    this.http_adapter = smart_embed.http_adapter;
  }
  async load() {
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
  unload() {
  }
};

// adapters/transformers.js
var SmartEmbedTransformersAdapter = class extends SmartEmbedAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.model_key = this.smart_embed.model_key;
    this.model_config = this.smart_embed.model_config;
    this.model = null;
    this.tokenizer = null;
  }
  get batch_size() {
    return this.smart_embed.batch_size;
  }
  get max_tokens() {
    return this.smart_embed.max_tokens;
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
    this.model = await pipeline("feature-extraction", this.model_key, pipeline_opts);
    this.tokenizer = await AutoTokenizer.from_pretrained(this.model_key);
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
