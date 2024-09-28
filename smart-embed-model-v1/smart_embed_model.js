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
import embed_models from './models.json' with { type: 'json' };
// import embed_models from './models.json' assert { type: 'json' };
export class SmartEmbedModel extends SmartModel {
  /**
   * Create a SmartEmbed instance.
   * @param {string} env - The environment to use.
   * @param {object} opts - Full model configuration object or at least a model_key and adapter
   */
  constructor(env, opts={}) {
    super(opts);
    if(this.opts.model_key === "None") return console.log(`Smart Embed Model: No active embedding model for ${this.collection_key}, skipping embedding`);
    this.env = env;
    this.opts = {
      ...(
        this.env.opts.modules.smart_embed_model?.class // if is module object (not class, has class key)
        ? { ...this.env.opts.modules.smart_embed_model, class: null }
        : {}
      ),
      ...embed_models[opts.model_key], // ewww gross
      ...opts,
    };
    if(!this.opts.adapter) return console.warn('SmartEmbedModel adapter not set');
    if(!this.opts.adapters[this.opts.adapter]) return console.warn(`SmartEmbedModel adapter ${this.opts.adapter} not found`);
    // prepare opts for GPU (likely better handled in future)
    this.opts.use_gpu = !!navigator.gpu && this.opts.gpu_batch_size !== 0;
    if(this.opts.adapter === 'transformers' && this.opts.use_gpu) this.opts.batch_size = this.opts.gpu_batch_size || 10;
  }
  get adapters() { return this.opts.adapters || this.env.opts.modules.smart_embed_model.adapters; }
  get adapter() {
    if(!this._adapter) this._adapter = new this.adapters[this.opts.adapter](this);
    return this._adapter;
  }
  async load() {
    this.loading = true;
    await this.adapter.load();
    this.loading = false;
    this.loaded = true;
  }
  async unload() {
    await this.adapter.unload();
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

  get model_config() { return embed_models[this.opts.model_key]; }
  get batch_size() { return this.opts.batch_size || 1; }
  get max_tokens() { return this.opts.max_tokens || 512; }
  get dims() { return this.opts.dims; }

  // TODO: replace static opts with dynamic reference to canonical settings via opts.settings (like smart-chat-model-v2)
  get settings() { return this.opts.settings; } // ref to canonical settings

  get settings_config() { return this.process_settings_config(settings_config, 'embed_model'); }
  process_setting_key(key) {
    return key.replace(/\[EMBED_MODEL\]/g, this.opts.model_key);
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

export const settings_config = {
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
  "[EMBED_MODEL].api_key": {
    name: 'OpenAI API Key for embeddings',
    type: "password",
    description: "Required for OpenAI embedding models",
    placeholder: "Enter OpenAI API Key",
    // callback: 'test_api_key_openai_embeddings',
    // callback: 'restart', // TODO: should be replaced with better unload/reload of smart_embed
    conditional: (_this) => !_this.settings.model_key?.includes('/')
  },
  "[EMBED_MODEL].gpu_batch_size": {
    name: 'GPU Batch Size',
    type: "number",
    description: "Number of embeddings to process per batch on GPU. Use 0 to disable GPU.",
    placeholder: "Enter number ex. 10",
    // callback: 'restart',
  },
  "legacy_transformers": {
    name: 'Legacy Transformers (no GPU)',
    type: "toggle",
    description: "Use legacy transformers (v2) instead of v3.",
    callback: 'embed_model_changed',
  },
};