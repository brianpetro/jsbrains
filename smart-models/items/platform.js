import { CollectionItem } from 'smart-collections/item.js';

export class Platform extends CollectionItem {
  static get defaults() {
    return {
      ...super.defaults,
      data: {
        adapter_settings: {},
        meta: {},
      },
    };
  }

  get_key() {
    if (this.data?.key) return this.data.key;
    this.data.key = Date.now();
    return this.data.key;
  }

  get adapter_key() {
    return this.data.adapter_key;
  }

  get adapter_settings() {
    return this.data.adapter_settings || {};
  }
}

export default Platform;
