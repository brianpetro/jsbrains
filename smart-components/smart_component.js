import { CollectionItem } from 'smart-collections/item.js';

/**
 * @class SmartComponent
 * @extends CollectionItem
 * @description Thin wrapper around component metadata that delegates rendering to an adapter.
 */
export class SmartComponent extends CollectionItem {
  static key = 'smart_component';
  static collection_key = 'smart_components';
  collection_key = 'smart_components';

  get_key() {
    if (this.data?.key) return this.data.key;
    const scope_key = this.scope_key;
    const component_key = this.component_key;
    const version = Number.isFinite(this.data?.version) ? this.data.version : 0;
    const hash = this.data?.hash || 'nohash';
    const key_pcs = [];
    if (!component_key.includes(scope_key) && scope_key !== 'global') key_pcs.push(scope_key);
    key_pcs.push(component_key);
    return `${key_pcs.join('_').replace(/\./g, '_')}#${[version, hash].join('#')}`;
  }

  get scope_key() {
    return this.data?.scope_key;
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
