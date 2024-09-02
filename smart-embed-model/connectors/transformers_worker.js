// models.json
var models_default = {
  "TaylorAI/bge-micro-v2": {
    model_key: "TaylorAI/bge-micro-v2",
    batch_size: 1,
    dims: 384,
    max_tokens: 512,
    name: "BGE-micro-v2",
    description: "Local, 512 tokens, 384 dim",
    adapter: "transformers"
  },
  "andersonbcdefg/bge-small-4096": {
    model_key: "andersonbcdefg/bge-small-4096",
    batch_size: 1,
    dims: 384,
    max_tokens: 4096,
    name: "BGE-small-4K",
    description: "Local, 4,096 tokens, 384 dim",
    adapter: "transformers"
  },
  "Xenova/jina-embeddings-v2-base-zh": {
    model_key: "Xenova/jina-embeddings-v2-base-zh",
    batch_size: 1,
    dims: 512,
    max_tokens: 8192,
    name: "Jina-v2-base-zh-8K",
    description: "Local, 8,192 tokens, 512 dim, Chinese/English bilingual",
    adapter: "transformers"
  },
  "text-embedding-3-small": {
    model_key: "text-embedding-3-small",
    batch_size: 50,
    dims: 1536,
    max_tokens: 8191,
    name: "OpenAI Text-3 Small",
    description: "API, 8,191 tokens, 1,536 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "text-embedding-3-large": {
    model_key: "text-embedding-3-large",
    batch_size: 50,
    dims: 3072,
    max_tokens: 8191,
    name: "OpenAI Text-3 Large",
    description: "API, 8,191 tokens, 3,072 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "text-embedding-3-small-512": {
    model_key: "text-embedding-3-small",
    batch_size: 50,
    dims: 512,
    max_tokens: 8191,
    name: "OpenAI Text-3 Small - 512",
    description: "API, 8,191 tokens, 512 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "text-embedding-3-large-256": {
    model_key: "text-embedding-3-large",
    batch_size: 50,
    dims: 256,
    max_tokens: 8191,
    name: "OpenAI Text-3 Large - 256",
    description: "API, 8,191 tokens, 256 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "text-embedding-ada-002": {
    model_key: "text-embedding-ada-002",
    batch_size: 50,
    dims: 1536,
    max_tokens: 8191,
    name: "OpenAI Ada",
    description: "API, 8,191 tokens, 1,536 dim",
    endpoint: "https://api.openai.com/v1/embeddings",
    adapter: "openai"
  },
  "Xenova/jina-embeddings-v2-small-en": {
    model_key: "Xenova/jina-embeddings-v2-small-en",
    batch_size: 1,
    dims: 512,
    max_tokens: 8192,
    name: "Jina-v2-small-en",
    description: "Local, 8,192 tokens, 512 dim",
    adapter: "transformers"
  },
  "nomic-ai/nomic-embed-text-v1.5": {
    model_key: "nomic-ai/nomic-embed-text-v1.5",
    batch_size: 1,
    dims: 256,
    max_tokens: 8192,
    name: "Nomic-embed-text-v1.5",
    description: "Local, 8,192 tokens, 256 dim",
    adapter: "transformers"
  },
  "Xenova/bge-small-en-v1.5": {
    model_key: "Xenova/bge-small-en-v1.5",
    batch_size: 1,
    dims: 384,
    max_tokens: 512,
    name: "BGE-small",
    description: "Local, 512 tokens, 384 dim",
    adapter: "transformers"
  },
  "nomic-ai/nomic-embed-text-v1": {
    model_key: "nomic-ai/nomic-embed-text-v1",
    batch_size: 1,
    dims: 768,
    max_tokens: 2048,
    name: "Nomic-embed-text",
    description: "Local, 2,048 tokens, 768 dim",
    adapter: "transformers"
  }
};

// smart_embed_model.js
var SmartEmbedModel = class _SmartEmbedModel {
  /**
   * Create a SmartEmbed instance.
   * @param {string} env - The environment to use.
   * @param {object} opts - Full model configuration object or at least a model_key and adapter
   */
  constructor(env, opts = {}) {
    this.env = env;
    this.opts = {
      ...models_default[opts.embed_model_key],
      ...opts
    };
    console.log(this.opts);
    if (!this.opts.adapter) return console.warn("SmartEmbedModel adapter not set");
    if (!this.env.opts.smart_embed_adapters[this.opts.adapter]) return console.warn(`SmartEmbedModel adapter ${this.opts.adapter} not found`);
    this.opts.use_gpu = !!navigator.gpu && this.opts.gpu_batch_size !== 0;
    if (this.opts.adapter === "transformers" && this.opts.use_gpu) this.opts.batch_size = this.opts.gpu_batch_size || 10;
    this.adapter = new this.env.opts.smart_embed_adapters[this.opts.adapter](this);
  }
  /**
   * Used to load a model with a given configuration.
   * @param {*} env 
   * @param {*} opts 
   */
  static async load(env, opts = {}) {
    try {
      const model2 = new _SmartEmbedModel(env, opts);
      await model2.adapter.load();
      env.smart_embed_active_models[opts.embed_model_key] = model2;
      return model2;
    } catch (error) {
      console.error(`Error loading model ${opts.model_key}:`, error);
      return null;
    }
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
    const { pipeline, env, AutoTokenizer } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.13");
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
};

// build/transformers_worker_script.js
var model = null;
var smart_env = {
  smart_embed_active_models: {},
  opts: {
    smart_embed_adapters: {
      transformers: SmartEmbedTransformersAdapter
    }
  }
};
async function process_message(data) {
  const { method, params, id, worker_id } = data;
  try {
    let result;
    switch (method) {
      case "load":
        console.log("load", params);
        model = await SmartEmbedModel.load(smart_env, { adapter: "transformers", model_key: params.model_key, ...params });
        result = { model_loaded: true };
        break;
      case "embed_batch":
        if (!model) throw new Error("Model not loaded");
        result = await model.embed_batch(params.inputs);
        break;
      case "count_tokens":
        if (!model) throw new Error("Model not loaded");
        result = await model.count_tokens(params);
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
