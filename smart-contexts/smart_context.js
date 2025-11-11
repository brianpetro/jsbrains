/**
 * @file smart_context.js
 *
 * A single SmartContext item that references multiple data sources (files, blocks, directories, etc.)
 * to compile a final contextual output. Actual compilation is now handled by adapters in ./adapters/.
 */

import { CollectionItem } from 'smart-collections';
import { get_snapshot } from './utils/get_snapshot.js';
import { merge_context_opts } from './utils/merge_context_opts.js';
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
    };
    if(!key) return console.error('SmartContext: add_item called with invalid item', item);
    this.data.context_items[key] = context_item;
    this.queue_save();
    this.send_updated_event();
  }

  /**
   * add_items
   * @param {string[]|object[]} items
   */
  add_items(items) {
    if(!Array.isArray(items)) items = [items];
    items.forEach(item => this.add_item(item));
  }

  /**
   * remove_item
   * Removes a path/ref from context and emits context:updated
   * @param {string} key
   */
  remove_item(key) {
    if(!key || !this.data?.context_items?.[key]) return;
    delete this.data.context_items[key];
    this.queue_save();
    this.send_updated_event();
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

  // /** Map any key to ContextItem  */
  get_context_item(key) {
    const existing = this.env.context_items.get(key);
    if (existing) return existing;
    return this.env.context_items.new_item({ key, ...(this.data.context_items[key] || {}) });
  }

  /**
   * get_snapshot
   * @async
   * @deprecated in favor of get_text and get_object (2025-11-11)
   */
  async get_snapshot(opts = {}) {
    const merged_opts = merge_context_opts(this, opts);
    return await get_snapshot(this, merged_opts);
  }

  /**
   * compile
   * @async
   * @deprecated in favor of get_text and get_object (2025-11-11)
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
   */
  get_ref(key) {
    return this.collection.get_ref(key);
  }

  get_item_keys_by_depth(depth) {
    return Object.keys(this.data.context_items)
      .filter(k => {
        const item_depth = this.data.context_items[k].d;
        if(item_depth === depth) return true;
        if(typeof item_depth === 'undefined' && depth === 0) return true;
        return false;
      });
  }

  get context_item_keys() {
    return Object.keys(this.data?.context_items || {});
  }

  get key() {
    if (!this.data.key) {
      this.data.key = Date.now().toString();
    }
    return this.data.key;
  }
  get has_context_items() {
    return Object.keys(this.data.context_items || {}).length > 0;
  }

  send_updated_event() {
    if(this._debounce_send_updated_event) clearTimeout(this._debounce_send_updated_event);
    this._debounce_send_updated_event = setTimeout(() => {
      this.emit_event('context:updated');
    }, 100);
  }

  get name () {
    return this.data.name;
  }
  set name (name) {
    if (typeof name !== 'string') throw new TypeError('Name must be a string');
    this.data.name = name;
    this.send_updated_event()
  }
  get size () {
    let size = 0;
    const context_items = this.get_context_items();
    context_items.forEach(item => {
      if (item.size) size += item.size;
    });
    return size;
  }

}
