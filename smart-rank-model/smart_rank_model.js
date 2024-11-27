// Copyright (c) Brian Joseph Petro

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import { SmartModel } from 'smart-model';
import rank_models from './models.json' assert { type: 'json' };

/**
 * SmartRankModel - A versatile class for handling document ranking using various model backends
 * @extends SmartModel
 * 
 * @example
 * ```javascript
 * const rankModel = await SmartRankModel.load(env, {
 *   model_key: 'cohere',
 *   adapter: 'cohere',
 *   settings: {
 *     cohere_api_key: 'your-cohere-api-key',
 *   },
 * });
 * 
 * const rankings = await rankModel.rank("Your query here", ["Doc 1", "Doc 2"]);
 * console.log(rankings);
 * ```
 */
export class SmartRankModel extends SmartModel {
  static defaults = {
    model_key: 'cohere', // Default to Cohere adapter
  };

  /**
   * Create a SmartRankModel instance
   * @param {Object} opts - Configuration options
   * @param {Object} [opts.adapters] - Map of available adapter implementations
   * @param {Object} [opts.settings] - User settings
   * @param {string} [opts.model_key] - Model key to select the adapter
   */
  constructor(opts = {}) {
    super(opts);
  }

  /**
   * Load the SmartRankModel with the specified configuration.
   * @param {Object} env - Environment configurations
   * @param {Object} opts - Configuration options
   * @returns {Promise<SmartRankModel>} Loaded SmartRankModel instance
   */
  static async load(env, opts = {}) {
    if (env.smart_rank_active_models?.[opts.model_key]) {
      return env.smart_rank_active_models[opts.model_key];
    }
    try {
      const model = new SmartRankModel(opts);
      await model.adapter.load();
      if (!env.smart_rank_active_models) env.smart_rank_active_models = {};
      env.smart_rank_active_models[opts.model_key] = model;
      return model;
    } catch (error) {
      console.error(`Error loading rank model ${opts.model_key}:`, error);
      return null;
    }
  }

  /**
   * Rank documents based on a query.
   * @param {string} query - The query string
   * @param {Array<string>} documents - Array of document strings
   * @returns {Promise<Array<Object>>} Ranked documents
   */
  async rank(query, documents) {
    return await this.invoke_adapter_method('rank', query, documents);
  }

  /**
   * Get available ranking models.
   * @returns {Object} Map of ranking models
   */
  get models() { 
    return rank_models; 
  }

  /** @override */
  get default_model_key() {
    return 'cohere'; // Ensure consistency with adapters
  }

  /**
   * Get settings configuration schema.
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    const _settings_config = {
      model_key: {
        name: 'Ranking Model',
        type: "dropdown",
        description: "Select a ranking model to use.",
        options_callback: 'get_ranking_model_options',
        callback: 'reload_model',
        default: this.default_model_key,
      },
      "[RANKING_ADAPTER].cohere_api_key": {
        name: 'Cohere API Key',
        type: "password",
        description: "Enter your Cohere API key for ranking.",
        placeholder: "Enter Cohere API Key",
      },
      // Add adapter-specific settings here
      ...(this.adapter.settings_config || {}),
    };
    return this.process_settings_config(_settings_config, 'ranking_adapter');
  }

  process_setting_key(key) {
    return key.replace(/\[RANKING_ADAPTER\]/g, this.adapter_name);
  }

  /**
   * Get available ranking model options.
   * @returns {Array<Object>} Array of model options with value and name
   */
  get_ranking_model_options() {
    return Object.keys(this.adapters).map(key => ({ value: key, name: key }));
  }

  /**
   * Reload ranking model.
   */
  reload_model() {
    if (this.adapter && typeof this.adapter.load === 'function') {
      this.adapter.load();
    }
  }
}