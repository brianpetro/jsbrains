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
import { SmartHttpRequest } from "smart-http-request";
export class SmartEmbedModel extends SmartModel {
  /**
   * Create a SmartEmbedModel instance.
   * @param {object} opts - Options for the model, including settings.
   */
  constructor(opts = {}) {
    super(opts);
    this._adapters = {};
    this._http_adapter = null;
    this.opts = {
      ...embed_models[opts.settings?.model_key],
      ...opts,
    };
    if (!this.opts.adapter) return console.warn('SmartEmbedModel adapter not set');
    if (!this.opts.adapters[this.opts.adapter]) return console.warn(`SmartEmbedModel adapter ${this.opts.adapter} not found`);
    // prepare opts for GPU (likely better handled in future)
    this.opts.use_gpu = !!navigator.gpu && this.opts.gpu_batch_size !== 0;
    if (this.opts.adapter === 'transformers' && this.opts.use_gpu) this.opts.batch_size = this.opts.gpu_batch_size || 10;
  }
  async load() {
    this.loading = true;
    await this.adapter.load();
    this.loading = false;
    this.loaded = true;
  }
  /**
   * Count the number of tokens in the input string.
   * @param {string} input - The input string to process.
   * @returns {Promise<number>} A promise that resolves with the number of tokens.
   */
  async count_tokens(input) {
    return this.adapter.count_tokens(input);
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
    return await this.adapter.embed_batch(inputs);
  }

  get batch_size() { return this.opts.batch_size || 1; }
  get max_tokens() { return this.opts.max_tokens || 512; }
  get dims() { return this.opts.dims; }
  get model_config() { return embed_models[this.model_key]; }

  get settings() { return this.opts.settings; }
  get adapter_key() { return this.model_config.adapter; }
  get model_key() {
    return this.opts.model_key // directly passed opts take precedence
      || this.settings.model_key // then settings
    ;
  }

  get adapters() { return this.opts.adapters; }
  get adapter() {
    if (!this._adapters[this.adapter_key]) {
      this._adapters[this.adapter_key] = new this.adapters[this.adapter_key](this);
    }
    return this._adapters[this.adapter_key];
  }

  get http_adapter() {
    if (!this._http_adapter) {
      if (this.opts.http_adapter) this._http_adapter = this.opts.http_adapter;
      else this._http_adapter = new SmartHttpRequest();
    }
    return this._http_adapter;
  }

  get settings_config() {
    const _settings_config = {
      model_key: {
        name: 'Embedding Model',
        type: "dropdown",
        description: "Select an embedding model.",
        options_callback: 'get_embedding_model_options',
        callback: 'embed_model_changed',
        default: 'TaylorAI/bge-micro-v2',
      },
      "[EMBED_MODEL].min_chars": {
        name: 'Minimum Embedding Length',
        type: "number",
        description: "Minimum length of note to embed.",
        placeholder: "Enter number ex. 300",
      },
      "[EMBED_MODEL].api_key": {
        name: 'OpenAI API Key for embeddings',
        type: "password",
        description: "Required for OpenAI embedding models",
        placeholder: "Enter OpenAI API Key",
        callback: 'restart',
        conditional: (settings) => !settings.model_key?.includes('/')
      },
      "[EMBED_MODEL].gpu_batch_size": {
        name: 'GPU Batch Size',
        type: "number",
        description: "Number of embeddings to process per batch on GPU. Use 0 to disable GPU.",
        placeholder: "Enter number ex. 10",
        callback: 'restart',
      },
      ...(this.adapter.settings_config || {}),
    };
    return this.process_settings_config(_settings_config);
  }

  process_setting_key(key) {
    return key.replace(/\[EMBED_MODEL\]/g, this.settings.model_key);
  }

  get_embedding_model_options() {
    return Object.entries(embed_models).map(([key, model]) => ({ value: key, name: key }));
  }

  get_block_embedding_model_options() {
    const options = this.get_embedding_model_options();
    options.unshift({ value: 'None', name: 'None' });
    return options;
  }

}
