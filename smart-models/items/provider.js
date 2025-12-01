import { CollectionItem } from 'smart-collections/item.js';

export class Provider extends CollectionItem {
  new_model(data = {}) {
    if (!data.provider_key) throw new Error('provider_key is required to create a new model');
    const model = this.env.models.new_model({
      provider_key: this.key,
      ...data,
    });
    return model;
  }

  get_key() {
    if (this.data?.key) return this.data.key;
    this.data.key = Date.now();
    return this.data.key;
  }

  get settings() {
    return this.data;
  }

}

export default Provider;
