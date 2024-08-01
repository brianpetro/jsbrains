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
   * @param {string|object} config - The model configuration key or the model configuration object.
   * expects model to contain at least a model_key
   */
  constructor(env, config) {
    this.env = env;
    if(config.model_key) this.config = {...embed_models[config.model_key], ...config};
    else this.config = { ...config };
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
  }

  /**
   * Factory method to create a new SmartEmbed instance and initialize it.
   * @param {string} env - The environment to use.
   * @param {string} model_config - Full model configuration object or at least a model_key, api_key, and adapter
   * @returns {Promise<SmartEmbed>} A promise that resolves with an initialized SmartEmbed instance.
   */
  static async create(env, model_config) {
    const model = new this(env, model_config);
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
   * Embed the input string into a numerical array.
   * @param {string} input - The input string to embed.
   * @returns {Promise<number[]>} A promise that resolves with the embedding array.
   */
  async embed(input) {
    if (this.adapter && typeof this.adapter.embed === 'function') {
      return await this.adapter.embed(input);
    }
    // Default embedding logic here if no adapter or adapter lacks the method
  }

  /**
   * Embed a batch of input strings into arrays of numerical arrays.
   * @param {string[]} input - The array of strings to embed.
   * @returns {Promise<number[][]>} A promise that resolves with the array of embedding arrays.
   */
  async embed_batch(input) {
    if (this.adapter && typeof this.adapter.embed_batch === 'function') {
      return await this.adapter.embed_batch(input);
    }
    // Default batch embedding logic here if no adapter or adapter lacks the method
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
    this.process_queue();
    this._update_progress();
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
    
    if (this.entity_queue.length >= this.batch_size) {
      this._process_queue();
    } else {
      this._process_queue_debounced();
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
      if (resp.error) {
        throw new Error(`Error embedding batch: ${resp.error}`);
      }
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
    ], { timeout: 0 });
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
    this.resume_timeout = setTimeout(() => {
      console.log("Resuming queue processing");
      this.process_queue();
    }, delay);
  }

}
exports.SmartEmbedModel = SmartEmbedModel;