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

export class SmartRankModel {
  /**
   * Create a SmartRank instance.
   * @param {string} env - The environment to use.
   * @param {object} opts - Full model configuration object or at least a model_key and adapter
   */
  constructor(env, opts={}) {
    this.env = env;
    this.opts = {
      // ...rank_models[opts.rank_model_key],
      ...opts,
    };
    console.log(this.opts);
    // if(!this.opts.adapter) throw new Error('SmartRankModel adapter not set');
    if(!this.opts.adapter) return console.warn('SmartRankModel adapter not set');
    // if(!this.env.opts.smart_rank_adapters[this.opts.adapter]) throw new Error(`SmartRankModel adapter ${this.opts.adapter} not found`);
    if(!this.env.opts.smart_rank_adapters[this.opts.adapter]) return console.warn(`SmartRankModel adapter ${this.opts.adapter} not found`);
    // prepare opts for GPU (likely better handled in future)
    this.opts.use_gpu = !!navigator.gpu && this.opts.gpu_batch_size !== 0;
    if(this.opts.use_gpu) this.opts.batch_size = this.opts.gpu_batch_size || 10;
    // init adapter
    this.adapter = new this.env.opts.smart_rank_adapters[this.opts.adapter](this);
  }
  /**
   * Used to load a model with a given configuration.
   * @param {*} env 
   * @param {*} opts 
   */
  static async load(env, opts = {}) {
    try {
      const model = new SmartRankModel(env, opts);
      await model.adapter.load();
      if(!env.smart_rank_active_models) env.smart_rank_active_models = {};
      env.smart_rank_active_models[opts.rank_model_key] = model;
      return model;
    } catch (error) {
      console.error(`Error loading rank model ${opts.model_key}:`, error);
      // this.unload(env, opts); // TODO: unload model if error
      return null;
    }
  }
  async rank(query, documents) {
    return this.adapter.rank(query, documents);
  }
}