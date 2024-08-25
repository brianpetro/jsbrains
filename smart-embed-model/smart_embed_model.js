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

  // Embed Entities
  embed_entity(entity){
    this.entity_queue.push(entity);
    this.queue_total++;
    this.last_queue_addition_time = Date.now();
    this._schedule_queue_processing();
    this._update_progress();
  }

  _schedule_queue_processing() {
    clearTimeout(this.queue_process_timeout);
    this.queue_process_timeout = setTimeout(() => {
      if (Date.now() - this.last_queue_addition_time >= 1000) {
        this.process_queue();
      } else {
        this._schedule_queue_processing();
      }
    }, 1000);
  }

  _update_progress() {
    if (this.embedded_total % 100 === 0) {
      this._show_progress_notice();
    }
  }

  _show_progress_notice() {
    const pause_btn = { text: "Pause", callback: this.halt_queue_processing.bind(this), stay_open: true };
    this.env.main.notices.show('embedding_progress', 
      [
        `Making Smart Connections...`,
        `Embedding progress: ${this.embedded_total} / ${this.queue_total}`,
        `${this._calculate_tokens_per_second()} tokens/sec using ${this.model_name}`
      ],
      { 
        timeout: 0,
        button: pause_btn
      })
    ;
  }

  _calculate_tokens_per_second() {
    const elapsed_time = (Date.now() - this.start_time) / 1000;
    return Math.round(this.total_tokens / elapsed_time);
  }

  process_queue() {
    if (this.is_queue_halted || this.is_processing_queue) return;
    
    if (this.entity_queue.length > 0) {
      this._process_queue();
    }
  }

  async _process_queue() {
    if (this.is_processing_queue) return;
    this.is_processing_queue = true;
    if(!this.start_time) this.start_time = Date.now();

    try {
      while (this.entity_queue.length > 0 && !this.is_queue_halted) {
        await this._process_batch();
      }
    } catch (error) {
      console.error("Error in _process_queue:", error);
    } finally {
      this.is_processing_queue = false;
      if (this.entity_queue.length === 0) this._queue_complete();
    }
  }

  async _process_batch() {
    const batch = this.entity_queue.splice(0, this.batch_size);
    try {
      await this._prepare_batch(batch);
      const resp = await this.embed_batch(batch);
      if (!resp || resp.error) throw new Error(`Error embedding batch: ${JSON.stringify(resp, null, 2)}`);
      await this._handle_batch_response(batch, resp);
    } catch (error) {
      console.error("Error processing batch:", error);
      this.entity_queue.unshift(...batch);
      throw error;
    }
  }

  async _prepare_batch(batch) {
    await Promise.all(batch.map(item => item.get_embed_input()));
  }

  async _handle_batch_response(batch, resp) {
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const response_item = resp[i];

      item._embed_input = null;
      item.queue_save();

      if (response_item?.tokens) {
        this.total_tokens += response_item.tokens;
      } else {
        console.warn("Unexpected response item:", response_item);
      }

      this.embedded_total++;
      this._update_progress();
    }
  }

  _queue_complete() {
    if (this.completed_queue_timeout) clearTimeout(this.completed_queue_timeout);
    this.completed_queue_timeout = setTimeout(() => {
      if(this.entity_queue.length) return;
      this._show_completion_notice();
      this._reset_queue_stats();
      this.env.save();
    }, 3000);
  }

  _show_completion_notice() {
    this.env.main.notices.remove('embedding_progress');
    this.env.main.notices.show('embedding_complete', [
      `Embedding complete.`,
      `${this.embedded_total} entities embedded.`,
      `${this._calculate_tokens_per_second()} tokens/sec using ${this.model_name}`
    ], { timeout: 10000 });
  }

  _reset_queue_stats() {
    this.embedded_total = 0;
    this.queue_total = 0;
    this.total_tokens = 0;
    this.start_time = null;
  }

  get debounce_wait() {
    return Math.max(100, Math.min(5000, 20 * this.batch_size));
  }

  _process_queue_debounced() {
    clearTimeout(this.debounce_timeout);
    this.debounce_timeout = setTimeout(() => this._process_queue(), this.debounce_wait);
  }

  halt_queue_processing() {
    this.is_queue_halted = true;
    clearTimeout(this.debounce_timeout);
    clearTimeout(this.resume_timeout);
    clearTimeout(this.queue_process_timeout);
    console.log("Queue processing halted");
    this.env.main.notices.remove('embedding_progress');
    this.env.main.notices.show('embedding_paused', [
      `Embedding paused.`,
      `Progress: ${this.embedded_total} / ${this.queue_total}`,
      `${this._calculate_tokens_per_second()} tokens/sec using ${this.model_name}`
    ],
    {
      timeout: 0,
      button: { text: "Resume", callback: this.resume_queue_processing.bind(this) }
    });
    this.start_time = null;
    this.env.save();
  }

  resume_queue_processing(delay = 0) {
    this.is_queue_halted = false;
    clearTimeout(this.resume_timeout);
    clearTimeout(this.queue_process_timeout);
    this.resume_timeout = setTimeout(() => {
      console.log("Resuming queue processing");
      this._schedule_queue_processing();
    }, delay);
  }

}
exports.SmartEmbedModel = SmartEmbedModel;