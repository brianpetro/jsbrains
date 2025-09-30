import { SmartComponentAdapter } from './_adapter.js';

/**
 * Adapter that renders SmartView-compatible modules.
 */
export class SmartViewComponentAdapter extends SmartComponentAdapter {
  static should_use_adapter(component_module) {
    return typeof component_module === 'function' || typeof component_module?.render === 'function';
  }
  get smart_view() {
    if (!this._smart_view) {
      this._smart_view = this.env.init_module('smart_view');
    }
    return this._smart_view;
  }
  async render(scope, opts = {}) {
    const render_fn = typeof this.module === 'function' ? this.module : this.module?.render;
    if (typeof render_fn !== 'function') {
      throw new Error('SmartViewComponentAdapter: render() missing on module');
    }
    return await render_fn.call(this.smart_view, scope, opts);
  }
}
