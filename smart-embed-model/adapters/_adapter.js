import { SmartModelAdapter } from "smart-model/adapters/_adapter.js";
/**
 * Base adapter class for embedding models
 * @abstract
 * @extends SmartModelAdapter
 */
export class SmartEmbedAdapter extends SmartModelAdapter {
  /**
   * @override in sub-class with adapter-specific default configurations
   * @property {string} id - The adapter identifier
   * @property {string} description - Human-readable description
   * @property {string} type - Adapter type ("API")
   * @property {string} endpoint - API endpoint
   * @property {string} adapter - Adapter identifier
   * @property {string} default_model - Default model to use
   */
  static defaults = {};
  /**
   * Create adapter instance
   * @param {SmartEmbedModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    /**
     * @deprecated use this.model instead
     */
    this.smart_embed = model;

  }

  /**
   * Count tokens in input text
   * @abstract
   * @param {string} input - Text to tokenize
   * @returns {Promise<Object>} Token count result
   * @property {number} tokens - Number of tokens in input
   * @throws {Error} If not implemented by subclass
   */
  async count_tokens(input) {
    throw new Error('count_tokens method not implemented');
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
    throw new Error('embed method not implemented');
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
    throw new Error('embed_batch method not implemented');
  }

  get settings_config() {
    return {
      "[ADAPTER].model_key": {
        name: 'Embedding Model',
        type: "dropdown",
        description: "Select an embedding model.",
        options_callback: 'adapter.get_models_as_options',
        callback: 'model_changed',
        default: this.constructor.defaults.default_model,
      },
    };
  }

  get dims() { return this.model_config.dims; }
  get max_tokens() { return this.model_config.max_tokens; }
  // get batch_size() { return this.model_config.batch_size; }

  get use_gpu() {
    if(typeof this._use_gpu === 'undefined'){
      if(typeof this.model.opts.use_gpu !== 'undefined') this._use_gpu = this.model.opts.use_gpu;
      else this._use_gpu = typeof navigator !== 'undefined' && !!navigator?.gpu && this.model_settings.gpu_batch_size !== 0;
    }
    return this._use_gpu;
  }
  set use_gpu(value) { this._use_gpu = value; }
  get batch_size() {
    if(this.use_gpu && this.model_config?.gpu_batch_size) return this.model_config.gpu_batch_size;
    return this.model.opts.batch_size || this.model_config.batch_size || 1;
  }
}
