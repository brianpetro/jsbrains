import { ContextItemAdapter } from './_adapter.js';

export class BlockContextItemAdapter extends ContextItemAdapter {
  static order = 6;
  static detect(key) {
    return key.includes('#');
  }

  get ref() { return this.env.smart_blocks.get(this.item.key); }
  get inlinks() { return this.ref.inlinks || []; }
  get outlinks() { return this.ref.outlinks || []; }
  get exists() { return !!(this.ref && !this.ref.is_gone); }
  get mtime() {
    return this.ref?.mtime || null;
  }
  get size () {
    return this.ref?.size || 0;
  }
  async get_text() {
    const block = this.ref;
    if(!block) return { error: 'Block not found' };
    return await block.read();
  }
  async open(event = null) {
    this.ref.actions.source_open(event);
  }

}
