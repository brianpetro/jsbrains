import { SmartRankAdapter } from "./_adapter.js";

/**
 * Default configurations for transformers adapter
 * @property {string} adapter - Adapter identifier
 * @property {string} description - Human-readable description
 * @property {string} default_model - Default model to use
 */
export const transformers_defaults = {
  adapter: 'transformers',
  description: 'Transformers',
  default_model: 'jinaai/jina-reranker-v1-tiny-en',
};

export const transformers_models = {
  'jinaai/jina-reranker-v1-tiny-en': {
    adapter: 'transformers',
    model_key: 'jinaai/jina-reranker-v1-tiny-en',
  },
  'jinaai/jina-reranker-v1-turbo-en': {
    adapter: 'transformers',
    model_key: 'jinaai/jina-reranker-v1-turbo-en',
  },
  'mixedbread-ai/mxbai-rerank-xsmall-v1': {
    adapter: 'transformers',
    model_key: 'mixedbread-ai/mxbai-rerank-xsmall-v1',
  },
  'Xenova/bge-reranker-base': {
    adapter: 'transformers',
    model_key: 'Xenova/bge-reranker-base',
  },
};

/**
 * Adapter for local transformer-based ranking models
 * Uses @huggingface/transformers for model loading and inference
 * @class SmartRankTransformersAdapter
 * @extends SmartRankAdapter
 * 
 * @example
 * ```javascript
 * const model = await SmartRankModel.load(env, {
 *   model_key: 'jinaai/jina-reranker-v1-tiny-en',
 *   adapters: {
 *     transformers: SmartRankTransformersAdapter
 *   }
 * });
 * const results = await model.rank('query', ['doc1', 'doc2']);
 * console.log(results);
 * ```
 */
export class SmartRankTransformersAdapter extends SmartRankAdapter {
  static defaults = transformers_defaults;

  /**
   * Create transformers adapter instance
   * @param {SmartRankModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    /** @type {any|null} */
    this.model_instance = null;
    /** @type {any|null} */
    this.tokenizer = null;
  }

  /**
   * Load model and tokenizer
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    console.log('TransformersAdapter initializing');
    console.log(this.model.model_key);
    const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;
    const pipeline_opts = {
      quantized: true,
    };

    if (this.model.opts.use_gpu) {
      console.log("[Transformers] Using GPU");
      pipeline_opts.device = 'webgpu';
      // pipeline_opts.dtype = 'fp32';
    } else {
      console.log("[Transformers] Using CPU");
      // env.backends.onnx.wasm.numThreads = 8;
    }

    this.model_instance = await AutoModelForSequenceClassification.from_pretrained(this.model.model_key, pipeline_opts);
    this.tokenizer = await AutoTokenizer.from_pretrained(this.model.model_key);
    console.log('TransformersAdapter initialized');
  }

  /**
   * Rank documents based on a query
   * @param {string} query - The query string
   * @param {Array<string>} documents - Documents to rank
   * @param {Object} [options={}] - Additional ranking options
   * @param {number} [options.top_k] - Limit the number of returned documents
   * @param {boolean} [options.return_documents=false] - Whether to include original documents in results
   * @returns {Promise<Array<Object>>} Ranked documents with properties like {index, score, text}
   */
  async rank(query, documents, options = {}) {
    console.log('TransformersAdapter ranking');
    console.log(documents);
    const { top_k = undefined, return_documents = false } = options;
    if (!this.model_instance || !this.tokenizer) await this.load();

    console.log("tokenizing");
    const inputs = this.tokenizer(
      new Array(documents.length).fill(query),
      { text_pair: documents, padding: true, truncation: true }
    );
    console.log("running model");
    const { logits } = await this.model_instance(inputs);
    console.log("done");
    return logits
      .sigmoid()
      .tolist()
      .map(([score], i) => ({
        index: i,
        score,
        ...(return_documents ? { text: documents[i] } : {})
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, top_k);
  }
}
