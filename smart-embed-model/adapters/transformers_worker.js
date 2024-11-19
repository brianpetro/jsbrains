import { SmartEmbedWorkerAdapter } from "./worker.js";
import { transformers_settings_config } from "./transformers.js";

/**
 * Adapter for running transformer models in a Web Worker
 * Combines transformer model capabilities with worker thread isolation
 * @extends SmartEmbedWorkerAdapter
 * 
 * @example
 * ```javascript
 * const model = new SmartEmbedModel({
 *   model_key: 'TaylorAI/bge-micro-v2',
 *   adapters: {
 *     transformers_worker: SmartEmbedTransformersWorkerAdapter
 *   }
 * });
 * ```
 */
export class SmartEmbedTransformersWorkerAdapter extends SmartEmbedWorkerAdapter {
  /**
   * Create transformers worker adapter instance
   * @param {SmartEmbedModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    // Create worker using a relative path
    let rel_path;
    if (import.meta.url.includes('smart-embed-model')) {
      rel_path = "../connectors/transformers_worker.js";
    } else {
      rel_path = "../node_modules/smart-embed-model/connectors/transformers_worker.js";
    }
    /** @type {URL} URL to worker script */
    this.worker_url = new URL(rel_path, import.meta.url);
  }

  /** @returns {Object} Settings configuration for transformers adapter */
  get settings_config() {
    return transformers_settings_config;
  }
}
