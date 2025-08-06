/**
 * @file smart_context.js
 *
 * A single SmartContext item that references multiple data sources (files, blocks, directories, etc.)
 * to compile a final contextual output. Actual compilation is now handled by adapters in ./adapters/.
 */

import { CollectionItem } from 'smart-collections';
import { get_snapshot } from './utils/get_snapshot.js';
import { merge_context_opts } from './utils/merge_context_opts.js';
import {
  BaseContextItem,
  SourceContextItem,
  ImageContextItem,
  PdfContextItem,
} from './context_item.js';
import { image_extension_regex } from './utils/image_extension_regex.js';
import { filter_redundant_context_items } from './utils/filter_redundant_context_items.js';
export class SmartContext extends CollectionItem {
  static version = 1;
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
   * add_item
   * @param {string|object} item
   */
  add_item(item) {
    let key;
    if(typeof item === 'object') {
      key = item.key || item.path;
    }else{
      key = item;
    }
    const context_item = {
      d: 0,
      ...(typeof item === 'object' ? item : {})
    }
    if(!key) return console.error('SmartContext: add_item called with invalid item', item);
    this.data.context_items[key] = context_item;
    this.queue_save();
  }

  /**
   * add_items
   * @param {string[]|object[]} items
   */
  add_items(items) {
    if(!Array.isArray(items)) {
      items = [items];
    }
    items.forEach(item => this.add_item(item));
  }
  /**
   * Return *ContextItem* instances (any depth) for a given key array.
   * @param {string[]} keys
   */
  get_context_items(keys = this.context_item_keys) {
    return filter_redundant_context_items(keys
      .map(k => this.get_context_item(k))
      .filter(Boolean)
    );
  }

  /** Map any key to ContextItem subclass */
  get_context_item(key) {
    const ctx_item = this.data?.context_items?.[key];
    if (ctx_item && typeof ctx_item === 'object' && 'content' in ctx_item) {
      return new BaseContextItem(this, key);
    }
    if (image_extension_regex.test(key)) return new ImageContextItem(this, key);
    if (key.endsWith(".pdf")) return new PdfContextItem(this, key);
    const src = this.env.smart_sources.get(key) || this.env.smart_blocks.get(key);
    return src ? new SourceContextItem(this, src) : null;
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
    return await get_snapshot(this, merged_opts);
  }

  /**
   * compile
   * Delegates to a compile adapter from this.collection.compile_adapters.
   * By default uses the 'default' adapter unless opts.adapter_key is given.
   * @async
   * @param {object} [opts={}]
   * @returns {Promise<object|string>} Typically {context, stats} from the template adapter
   */
  async compile(opts = {}) {
    const adapter_key = opts.adapter_key || 'default';
    const adapter_class = this.collection.compile_adapters[adapter_key];
    if (!adapter_class) {
      throw new Error(`SmartContext: Compile adapter not found: ${adapter_key}`);
    }
    const adapter = new adapter_class(this);
    return adapter.compile(opts);
  }

  /**
   * @method get_ref
   * @deprecated moving to using ContextItem instances
   * Looks up a reference in the environment. Distinguishes block vs source by '#' presence.
   */
  get_ref(key) {
    return this.collection.get_ref(key);
  }

  get_item_keys_by_depth(depth) {
    return Object.keys(this.data.context_items)
      .filter(k => {
        const item_depth = this.data.context_items[k].d;
        if(item_depth === depth) return true;
        if(typeof item_depth === 'undefined' && depth === 0) return true; // legacy case, no depth set
        return false;
      })
    ;
  }

  get context_item_keys() {
    return Object.keys(this.data?.context_items || {});
  }
  /**
   * If no user-provided key, fallback to a stable hash of the context_items.
   */
  get key() {
    if (!this.data.key) {
      this.data.key = Date.now().toString();
    }
    return this.data.key;
  }
  get has_context_items() {
    return Object.keys(this.data.context_items || {}).length > 0;
  }

}
