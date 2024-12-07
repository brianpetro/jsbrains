// smart_rank_model.js

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
 * SmartRankModel - A versatile class for handling document ranking using various model backends.
 * @extends SmartModel
 * 
 * @example
 * ```javascript
 * import { SmartRankModel } from 'smart-rank-model';
 * 
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
  /**
   * Default configurations for SmartRankModel.
   * @type {Object}
   */
  static defaults = {
    adapter: 'transformers', // Default to transformers adapter
    model_key: 'jinaai/jina-reranker-v1-tiny-en',
  };


  /**
   * Load the SmartRankModel with the specified configuration.
   * @param {Object} env - Environment configurations.
   * @param {Object} opts - Configuration options.
   * @param {string} opts.model_key - Model key to select the adapter.
   * @param {Object} [opts.adapters] - Optional map of adapters to override defaults.
   * @param {Object} [opts.settings] - Optional user settings.
   * @returns {Promise<SmartRankModel>} Loaded SmartRankModel instance.
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
   * ```
   */

  /**
   * Rank documents based on a query.
   * @param {string} query - The query string.
   * @param {Array<string>} documents - Array of document strings to rank.
   * @param {Object} [options={}] - Additional ranking options.
   * @param {number} [options.top_k] - Limit the number of returned documents.
   * @param {boolean} [options.return_documents=false] - Whether to include original documents in results.
   * @returns {Promise<Array<Object>>} Ranked documents with properties like {index, score, text}.
   * 
   * @example
   * ```javascript
   * const rankings = await rankModel.rank("What is the capital of the United States?", [
   *   "Carson City is the capital city of the American state of Nevada.",
   *   "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
   *   "Washington, D.C. is the capital of the United States.",
   * ]);
   * console.log(rankings);
   * ```
   */
  async rank(query, documents, options = {}) {
    return await this.invoke_adapter_method('rank', query, documents, options);
  }

  /**
   * Get available ranking models.
   * @returns {Object} Map of ranking models.
   */
  get models() { 
    return rank_models; 
  }

  /**
   * Get the default model key.
   * @returns {string} Default model key.
   */
  get default_model_key() {
    return 'jinaai/jina-reranker-v1-tiny-en'; // Ensure consistency with adapters
  }

  /**
   * Get settings configuration schema.
   * @returns {Object} Settings configuration object.
   */
  get settings_config() {
    const _settings_config = {
      adapter: {
        name: 'Ranking Model Platform',
        type: "dropdown",
        description: "Select a ranking model platform.",
        options_callback: 'get_platforms_as_options',
        callback: 'adapter_changed',
        default: this.constructor.defaults.adapter,
      },
      // Add adapter-specific settings here
      ...(this.adapter.settings_config || {}),
    };
    return this.process_settings_config(_settings_config);
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
