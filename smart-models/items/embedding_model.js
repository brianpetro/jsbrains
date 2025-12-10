import {Model} from './model.js';

export class EmbeddingModel extends Model {
  /**
   * Default properties for an instance of CollectionItem.
   * @returns {Object}
   */
  static get defaults() {
    return {
      data: {
        api_key: '',
        provider_key: 'transformers',
        model_key: 'TaylorAI/bge-micro-v2',
        dims: 384, // ???
        max_tokens: 512, // ???
      }
    };
  }
  async embed(input) {
    if (typeof input === 'string') {
      input = [{embed_input: input}];
    }
    return (await this.embed_batch(input))[0];
  }

  async embed_batch(inputs) {
    return this.instance.embed_batch(inputs);
  }

  async test_model() {
    try {
      const resp = await this.embed("test input");
      const success = resp && !resp?.error;
      this.data.test_passed = success;
      this.debounce_save();
      return {success, response: resp};
    } catch (e) {
      this.data.test_passed = false;
      return {error: e.message || String(e)};
    }
  }


}