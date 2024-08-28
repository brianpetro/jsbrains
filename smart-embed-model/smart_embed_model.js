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

import embed_models from './models.json' assert { type: 'json' };
export class SmartEmbedModel {
  /**
   * Create a SmartEmbed instance.
   * @param {string} env - The environment to use.
   * @param {object} opts - Full model configuration object or at least a model_key and adapter
   */
  constructor(env, opts={}) {
    this.env = env;
    this.opts = {
      ...embed_models[opts.model_key], // DEPRECATED for backwards compatibility
      ...opts,
    };
    console.log(this.opts);
    if(!this.opts.adapter) throw new Error('SmartEmbedModel adapter not set');
    if(!this.env.opts.smart_embed_adapters[this.opts.adapter]) throw new Error(`SmartEmbedModel adapter ${this.opts.adapter} not found`);
    this.adapter = new this.env.opts.smart_embed_adapters[this.opts.adapter](this);
    env.smart_embed_active_models[opts.model_key] = this;
  }
  /**
   * Used to load a model with a given configuration.
   * @param {*} env 
   * @param {*} opts 
   */
  static async load(env, opts = {}) {
    const model = new SmartEmbedModel(env, opts);
    await model.adapter.load();
    return model;
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
}