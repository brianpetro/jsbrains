import { SmartEmbedIframeAdapter } from "./iframe.js";
import { transformers_connector } from "../connectors/transformers_iframe.js";
import {
  transformers_defaults,
  transformers_settings_config, // DEPRECATED
  transformers_models,
  settings_config
} from "./transformers.js";
/**
 * Adapter for running transformer models in an iframe
 * Combines transformer model capabilities with iframe isolation
 * @extends SmartEmbedIframeAdapter
 * 
 * @example
 * ```javascript
 * const model = new SmartEmbedModel({
 *   model_key: 'TaylorAI/bge-micro-v2',
 *   adapters: {
 *     transformers_iframe: SmartEmbedTransformersIframeAdapter
 *   }
 * });
 * ```
 */
export class SmartEmbedTransformersIframeAdapter extends SmartEmbedIframeAdapter {
  static defaults = transformers_defaults;
  /**
   * Create transformers iframe adapter instance
   * @param {SmartEmbedModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    /** @type {string} Connector script content */
    this.connector = transformers_connector;
    if(this.adapter_settings.legacy_transformers || !this.use_gpu){
      this.connector = this.connector
        .replace('@huggingface/transformers', 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2')
      ;
      this.use_gpu = false;
    }
    else this.connector = this.connector
      .replace('@huggingface/transformers', 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1')
    ;
  }

  /** @returns {Object} Settings configuration for transformers adapter */
  get settings_config() {
    return {
      ...super.settings_config,
      ...transformers_settings_config
    };
  }
  /**
   * Get available models (hardcoded list)
   * @returns {Promise<Object>} Map of model objects
   */
  get_models() { return Promise.resolve(this.models); }
  get models() {
    return transformers_models;
  }
}
export { settings_config };
export default {
  class: SmartEmbedTransformersIframeAdapter,
  settings_config,
}