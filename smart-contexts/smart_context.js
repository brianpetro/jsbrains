/**
 * @file smart_context.js
 *
 * @description
 * A single SmartContext item that references multiple data sources (files, blocks, directories, etc.)
 * to compile a final contextual string. The actual snapshot-building logic is in `utils/snapshot.js`,
 * while the final compile step is done in `utils/compiler.js`.
 */

import { CollectionItem } from 'smart-collections';
import { build_snapshot } from './utils/snapshot.js';
import { compile_snapshot } from './utils/compiler.js';
import { murmur_hash_32_alphanumeric } from 'smart-utils/create_hash.js';
import { merge_context_opts } from './utils/merge_context_opts.js';

export class SmartContext extends CollectionItem {
  /**
   * Default data structure for a new SmartContext.
   * @static
   */
  static get defaults() {
    return {
      data: {
        key: '',
        context_items: {},
        context_opts: {}
      }
    };
  }

  /**
   * get_snapshot
   * Gathers items at depth=0..link_depth, respects exclusions, and tracks truncated/skipped items.
   * @async
   * @param {object} opts
   * @returns {Promise<object>} context_snapshot - an object with .items[0], .items[1], etc.
   */
  async get_snapshot(opts = {}) {
    const merged_opts = merge_context_opts(this, opts);
    // Only method allowed to pass the item directly to the utils
    return build_snapshot(this, merged_opts);
  }

  /**
   * compile
   * Re-checks `max_len` if needed for final output.
   * @async
   * @param {object} [opts={}]
   * @returns {Promise<{context: string, stats: object}>}
   */
  async compile(opts = {}) {
    const context_snapshot = await this.get_snapshot(opts);
    // We pass only the snapshot + merged options (not the item itself).
    // The specs require the compiler not to accept a context_item instance.
    const merged_opts = merge_context_opts(this, opts);
    return compile_snapshot(context_snapshot, merged_opts);
  }

  get_ref(key) {
    const collection = key.includes('#') ? this.env.smart_blocks : this.env.smart_sources;
    return collection.get(key);
  }

  /**
   * If no user-provided key, fallback to a stable hash of the context_items.
   */
  get key() {
    if (this.data.key) return this.data.key;
    const str = JSON.stringify(this.data.context_items || {});
    return murmur_hash_32_alphanumeric(str);
  }
}
