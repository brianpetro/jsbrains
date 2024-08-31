// models.json
var models_default = {
  "cohere-rerank-english-v3.0": {
    adapter: "cohere",
    model_name: "rerank-english-v3.0",
    model_description: "Cohere Rerank English v3.0",
    model_version: "3.0",
    endpoint: "https://api.cohere.ai/v1/rerank"
  },
  "jinaai/jina-reranker-v1-tiny-en": {
    adapter: "transformers",
    model_key: "jinaai/jina-reranker-v1-tiny-en"
  },
  "jinaai/jina-reranker-v1-turbo-en": {
    adapter: "transformers",
    model_key: "jinaai/jina-reranker-v1-turbo-en"
  },
  "mixedbread-ai/mxbai-rerank-xsmall-v1": {
    adapter: "transformers",
    model_key: "mixedbread-ai/mxbai-rerank-xsmall-v1"
  },
  "Xenova/bge-reranker-base": {
    adapter: "transformers",
    model_key: "Xenova/bge-reranker-base"
  }
};

// smart_rank_model.js
var SmartRankModel = class _SmartRankModel {
  /**
   * Create a SmartRank instance.
   * @param {string} env - The environment to use.
   * @param {object} opts - Full model configuration object or at least a model_key and adapter
   */
  constructor(env, opts = {}) {
    this.env = env;
    this.opts = {
      ...models_default[opts.model_key] || {},
      ...opts
    };
    if (!this.opts.adapter) return console.warn("SmartRankModel adapter not set");
    if (!this.env.opts.smart_rank_adapters[this.opts.adapter]) return console.warn(`SmartRankModel adapter ${this.opts.adapter} not found`);
    if (typeof navigator !== "undefined") this.opts.use_gpu = !!navigator?.gpu && this.opts.gpu_batch_size !== 0;
    this.opts.use_gpu = false;
    this.adapter = new this.env.opts.smart_rank_adapters[this.opts.adapter](this);
  }
  /**
   * Used to load a model with a given configuration.
   * @param {*} env 
   * @param {*} opts 
   */
  static async load(env, opts = {}) {
    if (env.smart_rank_active_models?.[opts.model_key]) return env.smart_rank_active_models[opts.model_key];
    try {
      const model2 = new _SmartRankModel(env, opts);
      await model2.adapter.load();
      if (!env.smart_rank_active_models) env.smart_rank_active_models = {};
      env.smart_rank_active_models[opts.model_key] = model2;
      return model2;
    } catch (error) {
      console.error(`Error loading rank model ${opts.model_key}:`, error);
      return null;
    }
  }
  async rank(query, documents) {
    return this.adapter.rank(query, documents);
  }
};

// adapters/_adapter.js
var SmartRankAdapter = class {
  constructor(smart_rank) {
    this.smart_rank = smart_rank;
  }
  async load() {
    throw new Error("Not implemented");
  }
  async rank(query, documents) {
    throw new Error("Not implemented");
  }
};

// adapters/transformers.js
var SmartRankTransformersAdapter = class extends SmartRankAdapter {
  constructor(smart_rank) {
    super(smart_rank);
    this.model = null;
    this.tokenizer = null;
  }
  get use_gpu() {
    return this.smart_rank.opts.use_gpu || false;
  }
  async load() {
    console.log("TransformersAdapter initializing");
    const { env, AutoTokenizer, AutoModelForSequenceClassification } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.13");
    console.log("Transformers loaded");
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
    this.model = await AutoModelForSequenceClassification.from_pretrained(this.smart_rank.opts.model_key, pipeline_opts);
    console.log("Model loaded");
    this.tokenizer = await AutoTokenizer.from_pretrained(this.smart_rank.opts.model_key);
    console.log("Tokenizer loaded");
    console.log("TransformersAdapter initialized");
  }
  async rank(query, documents, options = {}) {
    const { top_k = void 0, return_documents = false } = options;
    const inputs = this.tokenizer(
      new Array(documents.length).fill(query),
      { text_pair: documents, padding: true, truncation: true }
    );
    const { logits } = await this.model(inputs);
    return logits.sigmoid().tolist().map(([score], i) => ({
      index: i,
      score,
      ...return_documents ? { text: documents[i] } : {}
    })).sort((a, b) => b.score - a.score).slice(0, top_k);
  }
};

// build/transformers_worker_script.js
var model = null;
var smart_env = {
  smart_rank_active_models: {},
  opts: {
    smart_rank_adapters: {
      transformers: SmartRankTransformersAdapter
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
        model = await SmartRankModel.load(smart_env, { adapter: "transformers", model_key: params.model_key, ...params });
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
  console.log("message", event.data);
  const response = await process_message(event.data);
  self.postMessage(response);
});
console.log("worker loaded");
self.process_message = process_message;
