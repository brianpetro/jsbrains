const adapters = require('./adapters');

class SmartChunks {
  constructor(env, opts={}) {
    this.env = env;
    this.opts = opts;
    this._adapter = null;
  }
  get adapter() { return this._adapter || (this._adapter = new adapters[this.normalize_adapter_input(this.opts.adapter) || 'markdown'](this)) }
  normalize_adapter_input(adapter) { return adapter?.toLowerCase(); }

  async parse(entity, opts={}) {
    const adapter = opts.adapter ? 
      new adapters[this.normalize_adapter_input(opts.adapter)]({env: this.env, opts: opts}) :
      this.adapter
    ;
    return await adapter.parse(entity);
  }
}
exports.SmartChunks = SmartChunks;