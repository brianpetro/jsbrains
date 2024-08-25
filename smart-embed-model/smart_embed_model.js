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

const adapters = require('./adapters');
const embed_models = require('./models');

/**
 * An universal interface for embedding models.
 */
class SmartEmbedModel {
  /**
   * Create a SmartEmbed instance.
   * @param {string} env - The environment to use.
   * @param {object} opts - Full model configuration object or at least a model_key, api_key, and adapter
   */
  constructor(env, opts={}) {
    this.env = env;
    if(opts.model_key) this.config = {...embed_models[opts.model_key], ...opts};
    else this.config = { ...opts };
    // Initialize statistics
    this.embed_ct = 0; // Count of embeddings processed
    this.timestamp = null; // Last operation timestamp
    this.tokens = 0; // Count of tokens processed
    // Initialize adapter if specified in the configuration (else use api adapter)
    if(this.config.adapter) this.adapter = new adapters[this.config.adapter](this);
    else this.adapter = new adapters['api'](this);
  
    // embed entities
    this.entity_queue = [];
    this.debounce_timeout = null;
    this.is_processing_queue = false;
    this.queue_total = 0;
    this.embedded_total = 0;
    this.is_queue_halted = false;
    this.resume_timeout = null;
    this.total_tokens = 0;
    this.start_time = null;
    this.last_queue_addition_time = null;
    this.queue_process_timeout = null;
  }

  /**
   * Factory method to create a new SmartEmbed instance and initialize it.
   * @param {string} env - The environment to use.
   * @param {object} opts - Full model configuration object or at least a model_key, api_key, and adapter
   * @returns {Promise<SmartEmbed>} A promise that resolves with an initialized SmartEmbed instance.
   */
  static async create(env, opts={}) {
    const model = new this(env, opts);
    // Initialize adapter-specific logic if adapter is present
    if (model.adapter && typeof model.adapter.init === 'function') await model.adapter.init();
    return model;
  }

  /**
   * Count the number of tokens in the input string.
   * @param {string} input - The input string to process.
   * @returns {Promise<number>} A promise that resolves with the number of tokens.
   */
  async count_tokens(input) {
    if (this.adapter && typeof this.adapter.count_tokens === 'function') {
      return await this.adapter.count_tokens(input);
    }
    // Default token counting logic here if no adapter or adapter lacks the method
  }

  /**
   * Embed the input into a numerical array.
   * @param {string|Object} input - The input to embed. Can be a string or an object with an "embed_input" property.
   * @returns {Promise<Object>} A promise that resolves with an object containing the embedding vector.
   */
  async embed(input) {
    if (!input) return console.log("input is empty");
    
    let embed_input, result;
    if (typeof input === 'string') {
      embed_input = input;
    } else if (input && typeof input === 'object' && 'embed_input' in input) {
      embed_input = input.embed_input;
    } else {
      throw new Error('Invalid input format');
    }

    if (this.adapter && typeof this.adapter.embed === 'function') {
      result = await this.adapter.embed(embed_input);
    } else {
      // Default embedding logic here if no adapter or adapter lacks the method
      throw new Error('Embedding method not implemented');
    }

    if (typeof input === 'string') {
      return result;
    } else {
      input.vec = result.vec;
      input.tokens = result.tokens;
      return input;
    }
  }

  /**
   * Embed a batch of inputs into arrays of numerical arrays.
   * @param {Array<string|Object>} inputs - The array of inputs to embed. Each input can be a string or an object with an "embed_input" property.
   * @returns {Promise<Array<Object>>} A promise that resolves with an array of objects containing the embedding vectors.
   */
  async embed_batch(inputs) {
    inputs = inputs.filter(item => (typeof item === 'string' ? item : item.embed_input)?.length > 0);
    if (inputs.length === 0) return console.log("empty batch (or all items have empty embed_input)");

    let results;
    if (this.adapter && typeof this.adapter.embed_batch === 'function') {
      results = await this.adapter.embed_batch(inputs);
    } else {
      // Default batch embedding logic here if no adapter or adapter lacks the method
      throw new Error('Batch embedding method not implemented');
    }

    return results;
  }

  async unload() {
    if (this.adapter && typeof this.adapter.unload === 'function') {
      await this.adapter.unload();
    }
  }

  /**
   * Get the configured batch size for embedding.
   * @returns {number} The batch size.
   */
  get batch_size() { return this.config.batch_size; }

  /**
   * Get the dimensions of the embedding.
   * @returns {number} The dimensions of the embedding.
   */
  get dims() { return this.config.dims; }

  /**
   * Get the maximum number of tokens that can be processed.
   * @returns {number} The maximum number of tokens.
   */
  get max_tokens() { return this.config.max_tokens; }

  /**
   * Get the name of the model used for embedding.
   * @returns {string} The model name.
   */
  get model_name() { return this.config.model_name; }

}
exports.SmartEmbedModel = SmartEmbedModel;