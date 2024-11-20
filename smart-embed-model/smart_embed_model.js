// Copyright (c) Brian Joseph Petro

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import { SmartModel } from "smart-model";
import embed_models from './models.json' assert { type: 'json' };
/**
 * SmartEmbedModel - A versatile class for handling text embeddings using various model backends
 * @extends SmartModel
 * 
 * @example
 * ```javascript
 * const model = new SmartEmbedModel({
 *   model_key: 'TaylorAI/bge-micro-v2',
 *   use_gpu: true
 * });
 * 
 * const embeddings = await model.embed("Your text here");
 * console.log(embeddings.vec);
 * ```
 */
export class SmartEmbedModel extends SmartModel {
  static defaults = {
    model_key: 'TaylorAI/bge-micro-v2',
  };
  /**
   * Create a SmartEmbedModel instance
   * @param {Object} opts - Configuration options
   * @param {Object} [opts.adapters] - Map of available adapter implementations
   * @param {boolean} [opts.use_gpu] - Whether to enable GPU acceleration
   * @param {number} [opts.gpu_batch_size] - Batch size when using GPU
   * @param {number} [opts.batch_size] - Default batch size for processing
   * @param {Object} [opts.model_config] - Model-specific configuration
   * @param {string} [opts.model_config.adapter] - Override adapter type
   * @param {number} [opts.model_config.dims] - Embedding dimensions
   * @param {number} [opts.model_config.max_tokens] - Maximum tokens to process
   * @param {Object} [opts.settings] - User settings
   * @param {string} [opts.settings.api_key] - API key for remote models
   * @param {number} [opts.settings.min_chars] - Minimum text length to embed
   */
  constructor(opts = {}) {
    super(opts);
  }
  /**
   * Count tokens in an input string
   * @param {string} input - Text to tokenize
   * @returns {Promise<Object>} Token count result
   * @property {number} tokens - Number of tokens in input
   * 
   * @example
   * ```javascript
   * const result = await model.count_tokens("Hello world");
   * console.log(result.tokens); // 2
   * ```
   */
  async count_tokens(input) {
    return await this.invoke_adapter_method('count_tokens', input);
  }

  /**
   * Generate embeddings for a single input
   * @param {string|Object} input - Text or object with embed_input property
   * @returns {Promise<Object>} Embedding result
   * @property {number[]} vec - Embedding vector
   * @property {number} tokens - Token count
   * 
   * @example
   * ```javascript
   * const result = await model.embed("Hello world");
   * console.log(result.vec); // [0.1, 0.2, ...]
   * ```
   */
  async embed(input) {
    if(typeof input === 'string') input = {embed_input: input};
    return (await this.embed_batch([input]))[0];
  }

  /**
   * Generate embeddings for multiple inputs in batch
   * @param {Array<string|Object>} inputs - Array of texts or objects with embed_input
   * @returns {Promise<Array<Object>>} Array of embedding results
   * @property {number[]} vec - Embedding vector for each input
   * @property {number} tokens - Token count for each input
   * 
   * @example
   * ```javascript
   * const results = await model.embed_batch([
   *   { embed_input: "First text" },
   *   { embed_input: "Second text" }
   * ]);
   * ```
   */
  async embed_batch(inputs) {
    return await this.invoke_adapter_method('embed_batch', inputs);
  }

  /**
   * Get the current batch size based on GPU settings
   * @returns {number} Current batch size for processing
   */
  get batch_size() { return this.adapter.batch_size || 1; }

  /** @returns {Object} Map of available embedding models */
  get models() { return embed_models; }
  
  /** @returns {string} Default model key if none specified */
  get default_model_key() { return 'TaylorAI/bge-micro-v2'; }

  /**
   * Get settings configuration schema
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    const _settings_config = {
      model_key: {
        name: 'Embedding Model',
        type: "dropdown",
        description: "Select an embedding model.",
        options_callback: 'embed_model.get_embedding_model_options',
        callback: 'embed_model_changed',
        default: 'TaylorAI/bge-micro-v2',
      },
      "[EMBED_MODEL].min_chars": {
        name: 'Minimum Embedding Length',
        type: "number",
        description: "Minimum length of note to embed.",
        placeholder: "Enter number ex. 300",
      },
      ...(this.adapter.settings_config || {}),
    };
    return this.process_settings_config(_settings_config, 'embed_model');
  }

  process_setting_key(key) {
    return key.replace(/\[EMBED_MODEL\]/g, this.model_key);
  }

  /**
   * Get available embedding model options
   * @returns {Array<Object>} Array of model options with value and name
   */
  get_embedding_model_options() {
    return Object.entries(this.models).map(([key, model]) => ({ value: key, name: key }));
  }

  /**
   * Get embedding model options including 'None' option
   * @returns {Array<Object>} Array of model options with value and name
   */
  get_block_embedding_model_options() {
    const options = this.get_embedding_model_options();
    options.unshift({ value: 'None', name: 'None' });
    return options;
  }

}
