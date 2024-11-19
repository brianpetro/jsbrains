import { SmartEmbedAdapter } from "./_adapter.js";

/**
 * Adapter for local transformer-based embedding models
 * Uses @xenova/transformers for model loading and inference
 * @extends SmartEmbedAdapter
 * 
 * @example
 * ```javascript
 * const model = new SmartEmbedModel({
 *   model_key: 'TaylorAI/bge-micro-v2',
 *   adapters: {
 *     transformers: SmartEmbedTransformersAdapter
 *   }
 * });
 * ```
 */
export class SmartEmbedTransformersAdapter extends SmartEmbedAdapter {
  /**
   * Create transformers adapter instance
   * @param {SmartEmbedModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    /** @type {Pipeline|null} Transformers pipeline instance */
    this.pipeline = null;
    /** @type {AutoTokenizer|null} Tokenizer instance */
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
    const { pipeline, env, AutoTokenizer } = await import('@xenova/transformers');

    env.allowLocalModels = false;
    const pipeline_opts = {
      quantized: true,
    };

    if (this.use_gpu) {
      console.log("[Transformers] Using GPU");
      pipeline_opts.device = 'webgpu';
      pipeline_opts.dtype = 'fp32';
    } else {
      console.log("[Transformers] Using CPU");
      env.backends.onnx.wasm.numThreads = 8;
    }

    this.pipeline = await pipeline('feature-extraction', this.model_key, pipeline_opts);
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
    const filtered_inputs = inputs.filter(item => item.embed_input?.length > 0);
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
    const tokens = await Promise.all(batch_inputs.map(item => this.count_tokens(item.embed_input)));
    const embed_inputs = await Promise.all(batch_inputs.map(async (item, i) => {
      if (tokens[i].tokens < this.max_tokens) return item.embed_input;
      let token_ct = tokens[i].tokens;
      let truncated_input = item.embed_input;
      while (token_ct > this.max_tokens) {
        const pct = this.max_tokens / token_ct;
        const max_chars = Math.floor(truncated_input.length * pct * 0.90);
        truncated_input = truncated_input.substring(0, max_chars) + "...";
        token_ct = (await this.count_tokens(truncated_input)).tokens;
      }
      tokens[i].tokens = token_ct;
      return truncated_input;
    }));

    try {
      const resp = await this.pipeline(embed_inputs, { pooling: 'mean', normalize: true });

      return batch_inputs.map((item, i) => {
        item.vec = Array.from(resp[i].data).map(val => Math.round(val * 1e8) / 1e8);
        item.tokens = tokens[i].tokens;
        return item;
      });
    } catch (err) {
      console.error("error_processing_batch", err);
      return Promise.all(batch_inputs.map(async (item) => {
        try {
          const result = await this.pipeline(item.embed_input, { pooling: 'mean', normalize: true });
          item.vec = Array.from(result[0].data).map(val => Math.round(val * 1e8) / 1e8);
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
}

/**
 * Default settings configuration for transformers adapter
 * @type {Object}
 */
export const transformers_settings_config = {
  "[EMBED_MODEL].gpu_batch_size": {
    name: 'GPU Batch Size',
    type: "number",
    description: "Number of embeddings to process per batch on GPU. Use 0 to disable GPU.",
    placeholder: "Enter number ex. 10",
  },
  "legacy_transformers": {
    name: 'Legacy Transformers (no GPU)',
    type: "toggle",
    description: "Use legacy transformers (v2) instead of v3.",
    callback: 'embed_model_changed',
    default: true,
  },
};