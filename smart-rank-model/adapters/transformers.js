/**
 * @file adapters/transformers.js
 * @description Adapter for local transformer-based ranking models
 * @module SmartRankTransformersAdapter
 */

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
    id: 'jinaai/jina-reranker-v1-tiny-en',
    adapter: 'transformers',
    model_key: 'jinaai/jina-reranker-v1-tiny-en',
  },
  'jinaai/jina-reranker-v1-turbo-en': {
    id: 'jinaai/jina-reranker-v1-turbo-en',
    adapter: 'transformers',
    model_key: 'jinaai/jina-reranker-v1-turbo-en',
  },
  'mixedbread-ai/mxbai-rerank-xsmall-v1': {
    id: 'mixedbread-ai/mxbai-rerank-xsmall-v1',
    adapter: 'transformers',
    model_key: 'mixedbread-ai/mxbai-rerank-xsmall-v1',
  },
  'Xenova/bge-reranker-base': {
    id: 'Xenova/bge-reranker-base',
    adapter: 'transformers',
    model_key: 'Xenova/bge-reranker-base',
  },
};

export const transformers_settings_config = {
  use_gpu: {
    setting: 'use_gpu',
    name: 'Use GPU',
    description: 'Use GPU for ranking (faster, may not work on all systems)',
    type: 'toggle',
    default: true,
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
      // env.backends.onnx.wasm.numThreads = 8; // breaks on windows
    }

    this.tokenizer = await AutoTokenizer.from_pretrained(this.model.model_key);
    this.model_instance = await AutoModelForSequenceClassification.from_pretrained(this.model.model_key, pipeline_opts);
    console.log('TransformersAdapter initialized', this.model.model_key);
    this.model.model_loaded = true;
    this.set_state('loaded');
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
    console.log('TransformersAdapter ranking');
    if (!this.model_instance || !this.tokenizer) {
      await this.load();
    }
    const { top_k = undefined, return_documents = false } = options;
    // documents = documents.slice(0, 10); // test with fewer documents

    console.log("tokenizing", query, documents);
    const inputs = this.tokenizer(
      new Array(documents.length).fill(query),
      { text_pair: documents, padding: true, truncation: true }
    );
    console.log("inputs", inputs);
    const { logits } = await this.model_instance(inputs);
    console.log("done", logits);



    console.log("logits.data", logits.data);
    // Convert logits to probabilities via sigmoid
    const results = logits
      .sigmoid()
      .tolist()
      .map(([score], i) => ({
        index: i,
        score,
        ...(return_documents ? { text: documents[i] } : {})
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, top_k)
    ;

    console.log(results);
    return results;
  }


  get models() {
    return transformers_models;
  }

  get settings_config() {
    return {
      ...(super.settings_config || {}),
      ...transformers_settings_config,
    };
  }
}