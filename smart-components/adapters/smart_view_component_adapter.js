import { SmartComponentAdapter } from './_adapter.js';

/**
 * Adapter that renders SmartView-compatible modules.
 */
export class SmartViewComponentAdapter extends SmartComponentAdapter {
  static should_use_adapter(component_module) {
    return typeof component_module === 'function' || typeof component_module?.render === 'function';
  }

  async render(scope, opts = {}) {
    const render_fn = typeof this.module === 'function' ? this.module : this.module?.render;
    if (typeof render_fn !== 'function') {
      throw new Error('SmartViewComponentAdapter: render() missing on module');
    }
    const smart_view = this.item.env.smart_view;
    if (!smart_view) {
      throw new Error('SmartViewComponentAdapter: smart_view module unavailable on environment');
    }
    return await render_fn.call(smart_view, scope, opts);
  }
}
