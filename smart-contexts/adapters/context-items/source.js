import { ContextItemAdapter } from './_adapter.js';

export class SourceContextItemAdapter extends ContextItemAdapter {
  static order = 7; // default lowest priority
  static detect(key) { return true; }

  get ref() { return this.env.smart_sources.get(this.item.key); }
  get inlinks() { return this.ref.inlinks || []; }
  get outlinks() { return this.ref.outlinks || []; }
  get exists() { return !!(this.ref && !this.ref.is_gone); }

  get size () {
    return this.ref?.size || 0;
  }
  get mtime() {
    return this.ref?.mtime || null;
  }
  async get_text() {
    return await this.ref?.read() || 'MISSING SOURCE';
  }
  async open(event = null) {
    this.ref.actions.source_open(event);
  }
}
