import { CollectionItem } from 'smart-collections/item.js';

export class ModelPlatform extends CollectionItem {
  static get defaults() {
    return {
      ...super.defaults,
      data: {
        adapter_settings: {},
        meta: {},
      },
    };
  }

  new_model(data = {}) {
    if (!data.model_type) throw new Error('model_type is required to create a new model');
    const model = this.env.models.new_model({
      model_platform_key: this.key,
      ...data,
    });
    return model;
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

export default ModelPlatform;
