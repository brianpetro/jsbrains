/**
 * @file default.js
 * Implements a compile adapter that uses the existing compiler.js logic to
 * produce a final context string plus stats (char_count, truncated_items, etc.).
 */

import { ContextCompileAdapter } from './_adapter.js';
import { compile_snapshot } from '../utils/compiler.js';
import { merge_context_opts } from '../utils/merge_context_opts.js';

/**
 * @class DefaultCompileAdapter
 * @extends ContextCompileAdapter
 * @description
 * Uses compile_snapshot to transform a snapshot into {context, stats}.
 */
export class DefaultContextCompileAdapter extends ContextCompileAdapter {
  static adapter_key = 'default';

  /**
   * @method compile
   * Builds a snapshot via get_snapshot, then calls compile_snapshot.
   * @param {object} [opts={}]
   * @returns {Promise<{context: string, stats: object}>}
   */
  async compile(opts = {}) {
    const snapshot = await this.context_item.get_snapshot(opts);
    const merged_opts = merge_context_opts(this.context_item, opts);
    return compile_snapshot(snapshot, merged_opts);
  }
}
