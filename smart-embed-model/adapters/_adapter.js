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
    if(typeof input === 'string') input = {embed_input: input};
    return (await this.embed_batch([input]))[0];
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
        name: 'Embedding model',
        type: "dropdown",
        description: "Select an embedding model.",
        options_callback: 'adapter.get_models_as_options',
        callback: 'model_changed',
        default: this.constructor.defaults.default_model,
      },
    };
  }

  get dims() { return this.model.data.dims; }
  get max_tokens() { return this.model.data.max_tokens; }

  get batch_size() {
    return this.model.data.batch_size || 1;
  }
}
