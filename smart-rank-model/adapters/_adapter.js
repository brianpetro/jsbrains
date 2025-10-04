import { SmartModelAdapter } from "smart-model/adapters/_adapter.js";

export const settings_config = {
  "[ADAPTER].model_key": {
    name: 'Ranking Model',
    type: "dropdown",
    description: "Select a ranking model to use.",
    options_callback: 'adapter.get_models_as_options',
    callback: 'reload_model',
  },
};
/**
 * Base adapter class for ranking models
 * @abstract
 * @class SmartRankAdapter
 * @extends SmartModelAdapter
 */
export class SmartRankAdapter extends SmartModelAdapter {
  /**
   * Create a SmartRankAdapter instance.
   * @param {SmartRankModel} model - The parent SmartRankModel instance
   */
  constructor(model) {
    super(model);
    /**
     * @deprecated Use this.model instead
     */
    this.smart_rank = model;
  }

  /**
   * Rank documents based on a query.
   * @abstract
   * @param {string} query - The query string
   * @param {Array<string>} documents - The documents to rank
   * @returns {Promise<Array<Object>>} Array of ranking results {index, score, ...}
   * @throws {Error} If the method is not implemented by subclass
   */
  async rank(query, documents) {
    throw new Error('rank method not implemented');
  }

  get settings_config() {
    return settings_config;
  }
}
