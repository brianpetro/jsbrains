/**
 * @file _adapter.js
 * Base adapter for compiling a SmartContext item into a final context output.
 * Adapters transform a snapshot (from get_snapshot) into either a raw object or a string with stats.
 */

/**
 * @class ContextCompileAdapter
 * @description
 * The default (base) compile adapter. It simply returns the snapshot from get_snapshot().
 * Subclasses can implement custom compilation logic (e.g., templating).
 */
export class ContextCompileAdapter {
  /**
   * @static
   * @type {string}
   * Identifies this adapter by a short, unique key. The collection
   * will store it in a map at `collection.compile_adapters[adapter_key]`.
   */
  static adapter_key = 'raw';

  /**
   * @constructor
   * @param {SmartContext} context_item
   */
  constructor(context_item) {
    this.context_item = context_item;
  }

  /**
   * @method compile
   * Returns the snapshot as-is (no further transformations).
   * @param {object} [opts={}]
   * @returns {Promise<object>} The snapshot from get_snapshot().
   */
  async compile(opts = {}) {
    const snapshot = await this.context_item.get_snapshot(opts);
    return snapshot; // raw snapshot
  }
}
