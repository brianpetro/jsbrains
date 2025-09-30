import { CollectionItem } from 'smart-collections/item.js';

/**
 * @class SmartComponent
 * @extends CollectionItem
 * @description Thin wrapper around component metadata that delegates rendering to an adapter.
 */
export class SmartComponent extends CollectionItem {
  static collection_key = 'smart_components';
  collection_key = 'smart_components';

  get_key() {
    if (this.data?.key) return this.data.key;
    const scope_key = this.scope_key || 'default';
    const component_key = this.component_key || 'component';
    const version = Number.isFinite(this.data?.version) ? this.data.version : 0;
    const hash = this.data?.hash || 'nohash';
    return `${[scope_key, component_key].join('.')}#${[version, hash].join('#')}`;
  }

  get scope_key() {
    return this.data?.scope_key || 'default';
  }
  get component_key() {
    return this.data?.component_key;
  }
  get component_adapter() {
    return this._component_adapter;
  }

  /**
   * Delegates render logic to the adapter.
   * @param {object} component_scope
   * @param {object} [opts={}]
   * @returns {Promise<*>}
   */
  async render(component_scope, opts = {}) {
    if (!this.component_adapter) {
      throw new Error(`SmartComponent: adapter missing for ${this.component_key}`);
    }
    return await this.component_adapter.render(component_scope, opts);
  }
}

export default SmartComponent;
