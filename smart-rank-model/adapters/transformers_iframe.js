import { SmartRankIframeAdapter } from "./iframe.js";
import { transformers_connector } from "../connectors/transformers_iframe.js";
import { transformers_defaults, transformers_models, transformers_settings_config } from "./transformers.js";

/**
 * Adapter for running transformer-based ranking models in an iframe
 * Combines transformer capabilities with iframe isolation.
 * @class SmartRankTransformersIframeAdapter
 * @extends SmartRankIframeAdapter
 * 
 * @example
 * ```javascript
 * const model = await SmartRankModel.load(env, {
 *   model_key: 'jinaai/jina-reranker-v1-tiny-en',
 *   adapters: {
 *     transformers_iframe: SmartRankTransformersIframeAdapter
 *   }
 * });
 * const results = await model.rank('query', ['doc1', 'doc2']);
 * console.log(results);
 * ```
 */
export class SmartRankTransformersIframeAdapter extends SmartRankIframeAdapter {
  static defaults = transformers_defaults;

  /**
   * Create transformers iframe adapter instance
   * @param {SmartRankModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    this.connector = transformers_connector;
  }
  get models() {
    return transformers_models;
  }
  get settings_config() {
    return {
      ...(super.settings_config || {}),
      ...transformers_settings_config,
    };
  }
}
