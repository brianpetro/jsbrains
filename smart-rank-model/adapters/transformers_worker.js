import { SmartRankWorkerAdapter } from "./worker.js";
import { transformers_defaults, transformers_settings_config } from "./transformers.js";

/**
 * Adapter for running transformer-based ranking models in a Web Worker
 * Provides isolation and parallel processing.
 * @class SmartRankTransformersWorkerAdapter
 * @extends SmartRankWorkerAdapter
 */
export class SmartRankTransformersWorkerAdapter extends SmartRankWorkerAdapter {
  static defaults = transformers_defaults;

  /**
   * Create transformers worker adapter instance
   * @param {SmartRankModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    // Set connector URL to the worker script
    this.connector = "../connectors/transformers_worker.js";
  }
  get settings_config() {
    return {
      ...(super.settings_config || {}),
      ...transformers_settings_config,
    };
  }
}
