import {Model} from './model.js';

export class RankingModel extends Model {
  /**
   * Default properties for an instance of RankingModel.
   * @returns {Object}
   */
  static get defaults() {
    return {
      data: {
        api_key: '',
        provider_key: 'cohere',
        model_key: 'rerank-v3.5',
      }
    };
  }

  /**
   * Rank documents based on a query using the underlying provider instance.
   * @param {string} query - The query string.
   * @param {Array<string>} documents - Documents to rank.
   * @param {Object} [options={}] - Optional provider specific options.
   * @returns {Promise<Array<Object>>} Ranked documents: [{ index, score, ... }, ...]
   */
  async rank(query, documents, options = {}) {
    return this.instance.rank(query, documents, options);
  }

  async test_model() {
    try {
      const resp = await this.rank("alphabetical order", ["z", "y", "x", "a", "b", "c"]);
      const success = Boolean(!resp.error && Array.isArray(resp) && resp.length);
      this.data.test_passed = success;
      this.debounce_save();
      return {success, response: resp};
    } catch (e) {
      this.data.test_passed = false;
      return {error: e.message || String(e)};
    }
  }
}
