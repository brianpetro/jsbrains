import { SmartEmbedIframeAdapter } from "./iframe.js";
import { transformers_connector } from "../connectors/transformers_iframe.js";
import { transformers_settings_config } from "./transformers.js";

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
  /**
   * Create transformers iframe adapter instance
   * @param {SmartEmbedModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    /** @type {string} Connector script content */
    this.connector = transformers_connector;
    if(this.settings.legacy_transformers || !this.use_gpu){
      this.connector = this.connector
        .replace('@xenova/transformers', 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2')
      ;
      this.use_gpu = false;
    }
    else this.connector = this.connector
      .replace('@xenova/transformers', 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.1')
    ;
  }

  /** @returns {Object} Settings configuration for transformers adapter */
  get settings_config() {
    return transformers_settings_config;
  }
}