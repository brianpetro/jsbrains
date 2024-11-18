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
 * Create a SmartEmbedModel instance.
 * @extends SmartModel
 * @inheritdoc SmartModel
 */
export class SmartEmbedModel extends SmartModel {
  /**
   * Create a SmartEmbedModel instance
   * @param {Object} opts - Configuration options
   * @param {string} [opts.adapter] - Adapter identifier
   * @param {Object} [opts.adapters] - Available adapters
   * @param {boolean} [opts.use_gpu] - Enable GPU acceleration
   * @param {number} [opts.gpu_batch_size] - Batch size for GPU processing
   * @param {number} [opts.batch_size] - General batch size
   * @param {Object} [opts.model_config] - Model-specific configuration
   * @param {string} [opts.model_config.adapter] - Adapter to use (e.g. 'openai')
   * @param {number} [opts.model_config.dims] - Embedding dimensions
   * @param {number} [opts.model_config.max_tokens] - Maximum tokens to process
   */
  constructor(opts = {}) {
    super(opts);
    // prepare opts for GPU (likely better handled in future)
    // this.opts.use_gpu = typeof navigator !== 'undefined' && !!navigator?.gpu && this.opts.gpu_batch_size !== 0;
    // if (this.model_config.adapter === 'transformers' && this.opts.use_gpu) {
    //   this.opts.batch_size = this.opts.gpu_batch_size || 10;
    // }
  }
  /**
   * Count the number of tokens in the input string.
   * @param {string} input - The input string to process.
   * @returns {Promise<number>} A promise that resolves with the number of tokens.
   */
  async count_tokens(input) {
    return await this.invoke_adapter_method('count_tokens', input);
  }

  /**
   * Embed the input into a numerical array.
   * @param {string|Object} input - The input to embed. Can be a string or an object with an "embed_input" property.
   * @returns {Promise<Object>} A promise that resolves with an object containing the embedding vector at `vec` and the number of tokens at `tokens`.
   */
  async embed(input) {
    if(typeof input === 'string') input = {embed_input: input};
    return (await this.embed_batch([input]))[0];
  }

  /**
   * Embed a batch of inputs into arrays of numerical arrays.
   * @param {Array<string|Object>} inputs - The array of inputs to embed. Each input can be a string or an object with an "embed_input" property.
   * @returns {Promise<Array<Object>>} A promise that resolves with an array of objects containing `vec` and `tokens` properties.
   */
  async embed_batch(inputs) {
    return await this.invoke_adapter_method('embed_batch', inputs);
  }

  /**
   * Get the current batch size
   * @returns {number} Batch size for processing
   */
  get batch_size() { return this.adapter.batch_size || 1; }


  get models() { return embed_models; }
  get default_model_key() { return 'TaylorAI/bge-micro-v2'; }

  get settings_config() {
    const _settings_config = {
      model_key: {
        name: 'Embedding Model',
        type: "dropdown",
        description: "Select an embedding model.",
        options_callback: 'embed_model.get_embedding_model_options',
        callback: 'embed_model_changed',
        default: 'TaylorAI/bge-micro-v2',
        // required: true
      },
      "[EMBED_MODEL].min_chars": {
        name: 'Minimum Embedding Length',
        type: "number",
        description: "Minimum length of note to embed.",
        placeholder: "Enter number ex. 300",
        // callback: 'refresh_embeddings',
        // required: true,
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
