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
    if(entity.file_type === 'canvas') opts.adapter = 'canvas';
    const adapter = this.get_adapter(opts);
    return await adapter.parse(entity);
  }
  get_adapter(opts) {
    return opts.adapter ?
      new adapters[this.normalize_adapter_input(opts.adapter)]({ env: this.env, opts: opts }) :
      this.adapter;
  }

  // returns original block content
  async get_block_from_path(path, entity, opts={}) {
    if(entity.file_type === 'canvas') opts.adapter = 'canvas';
    const adapter = this.get_adapter(opts);
    const {blocks} = await adapter.parse(entity);
    console.log(blocks);
    const block = blocks.find(block => block.path === path);
    if (!block) {
      throw new Error(`Block not found at path ${path}`);
    }
    if(opts.adapter === 'canvas') {
      return block.text;
    }
    return (await entity.get_content()).split('\n').slice(block.lines[0], block.lines[1]).join('\n');
  }
}
exports.SmartChunks = SmartChunks;

