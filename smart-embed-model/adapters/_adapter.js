import { SmartModelAdapter } from "smart-model/adapters/_adapter.js";
/**
 * @class SmartEmbedAdapter
 * @extends SmartModelAdapter
 * @abstract
 * @inheritdoc SmartModelAdapter
 */
export class SmartEmbedAdapter extends SmartModelAdapter {
  constructor(model) {
    super(model);
    /**
     * @deprecated use this.model instead
     */
    this.smart_embed = model;

  }

  async count_tokens(input) {
    throw new Error('count_tokens method not implemented');
  }

  async embed(input) {
    throw new Error('embed method not implemented');
  }

  async embed_batch(inputs) {
    throw new Error('embed_batch method not implemented');
  }


  get dims() { return this.model_config.dims; }
  get max_tokens() { return this.model_config.max_tokens; }
  // get batch_size() { return this.model_config.batch_size; }

  get use_gpu() {
    if(typeof this._use_gpu === 'undefined'){
      if(typeof this.model.opts.use_gpu !== 'undefined') this._use_gpu = this.model.opts.use_gpu;
      else this._use_gpu = typeof navigator !== 'undefined' && !!navigator?.gpu && this.model_settings.gpu_batch_size !== 0;
    }
    return this._use_gpu;
  }
  set use_gpu(value) { this._use_gpu = value; }
  get batch_size() {
    if(this.use_gpu && this.model_settings?.gpu_batch_size) return this.model_settings.gpu_batch_size;
    return this.model.opts.batch_size || this.model_config.batch_size || 1;
  }
}
