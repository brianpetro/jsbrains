import { SmartEmbedWorkerAdapter } from "./worker.js";
import { transformers_defaults, transformers_settings_config, transformers_models } from "./transformers.js";
import path from "path";

/**
 * Adapter for running transformer models in a Web Worker
 * Combines transformer model capabilities with worker thread isolation
 * @extends SmartEmbedWorkerAdapter
 */
export class SmartEmbedTransformersWorkerAdapter extends SmartEmbedWorkerAdapter {
  static defaults = transformers_defaults;
  /**
   * Create transformers worker adapter instance
   */
  constructor(model) {
    super(model);
    // Create worker using a relative path
    let rel_path;
    if (import.meta.url.includes('smart-embed-model')) {
      rel_path = "../connectors/transformers_worker.js";
    } else {
      rel_path = path.dirname(find_module_path("smart-embed-model")) + "/connectors/transformers_worker.js";
    }
    /** @type {URL} URL to worker script */
    this.worker_url = new URL(rel_path, import.meta.url);
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

import { createRequire } from "module";
const require = createRequire(import.meta.url);

/**
 * Finds and returns the absolute file system path to a node module's entry file.
 *
 * @param {string} module_name - The name of the node module to locate.
 * @returns {string} The absolute path to the module's entry file.
 * @throws {Error} If the module cannot be resolved.
 */
export function find_module_path(module_name) {
  try {
    return require.resolve(module_name);
  } catch (error) {
    throw new Error("Module not found: " + module_name);
  }
}