/**
 * @file smart_context.js
 *
 * A single SmartContext item that references multiple data sources (files, blocks, directories, etc.)
 * to compile a final contextual output. Actual compilation is now handled by adapters in ./adapters/.
 */

import { CollectionItem } from 'smart-collections';
import { get_snapshot } from './utils/get_snapshot.js';
import { merge_context_opts } from './utils/merge_context_opts.js';
import { murmur_hash_32_alphanumeric } from 'smart-utils/create_hash.js';

export class SmartContext extends CollectionItem {
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
    if(typeof item === 'object') {
      item = item.key || item.path;
    }
    if(!item) return console.error('SmartContext: add_item called with invalid item');
    this.data.context_items[item] = { d: 0 }
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
   * Looks up a reference in the environment. Distinguishes block vs source by '#' presence.
   */
  get_ref(key) {
    return this.collection.get_ref(key);
  }

  get_item_keys_by_depth(depth) {
    this.convert_data_context_items_bool_to_object(); // TEMPORARY for backwards compatibility
    return Object.keys(this.data.context_items).filter(k => this.data.context_items[k].d === depth);
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


  /**
   * Backwards compatibility (remove in v2)
   * Converts context_items from boolean to object with depth d=0
   */
  convert_data_context_items_bool_to_object() {
    if(Object.values(this.data.context_items).every(v => v === true)){
      Object.keys(this.data.context_items).forEach(k => {
        this.data.context_items[k] = { d: 0 }
      })
      this.queue_save()
    }
  }
}
