/**
 * @file smart_context.js
 *
 * A single SmartContext item that references multiple data sources (files, blocks, directories, etc.)
 * to compile a final contextual output. Actual compilation is now handled by adapters in ./adapters/.
 */

import { CollectionItem } from 'smart-collections';

/**
 * Prevents deletion from data (maintained as excluded instead of simple removal) for items that are 
 * derived from folders or named contexts.
 * @param {Record<string, object>} context_items
 * @param {string} key
 * @returns {boolean}
 */
const remove_context_item_data = (context_items, key) => {
  if (!key || !context_items?.[key]) return false;
  if (context_items[key].folder || context_items[key].from_named_context) {
    if (context_items[key].exclude) return false;
    context_items[key].exclude = true;
    return true;
  }
  delete context_items[key];
  return true;
};

export class SmartContext extends CollectionItem {
  static version = '2.0.1';
  static get defaults() {
    return {
      data: {
        key: '',
        context_items: {},
        context_opts: {}
      }
    };
  }
  
  // queue_save to debounce process save queue
  queue_save() {
    super.queue_save();
    this.collection.queue_save();
  }

  /**
   * add_item
   * @param {string|object} item
   */
  add_item(item, params={}) {
    const {
      emit_updated = true
    } = params;
    let key;
    if(typeof item === 'object') {
      key = item.key || item.path;
    }else{
      key = item;
    }
    const existing = this.data.context_items[key];
    const context_item = {
      d: 0,
      at: Date.now(),
      ...(existing || {}),
      ...(typeof item === 'object' ? item : {})
    };
    if(!key) return console.error('SmartContext: add_item called with invalid item', item);
    this.data.context_items[key] = context_item;
    this.queue_save();
    if(emit_updated) this.emit_event('context:updated', {add_item: key});
  }

  /**
   * add_items
   * @param {string[]|object[]} items
   */
  add_items(items) {
    if(!Array.isArray(items)) items = [items];
    items.forEach(item => this.add_item(item, { emit_updated: false }));
    this.emit_event('context:updated', { added_items: items.map(item => typeof item === 'object' ? item.key || item.path : item) });
  }

  /**
   * remove_item
   * Removes a path/ref from context and emits context:updated
   * @param {string} key
   * @param {object} params
   * @param {boolean} params.emit_updated
   */
  remove_item(key, params = {}) {
    const { emit_updated = true } = params;
    const removed = remove_context_item_data(this.data.context_items, key);
    if (!removed) return;
    this.queue_save();
    if (emit_updated) this.emit_event('context:updated', { removed_key: key, removed_keys: [key] });
  }

  /**
   * remove_items
   * Removes paths/refs from context and emits context:updated once
   * @param {string[]|string} keys
   * @param {object} params
   * @param {boolean} params.emit_updated
   * @returns {string[]}
   */
  remove_items(keys, params = {}) {
    const { emit_updated = true } = params;
    const items = Array.isArray(keys) ? keys : [keys];
    const removed_keys = [];
    items.forEach((item_key) => {
      if (remove_context_item_data(this.data.context_items, item_key)) {
        removed_keys.push(item_key);
      }
    });
    if (!removed_keys.length) return [];
    this.queue_save();
    if (emit_updated) this.emit_event('context:updated', { removed_keys });
    return removed_keys;
  }

  clear_all () {
    this.data.context_items = {};
    this.queue_save();
    this.emit_event('context:updated', { cleared: true });
  }


  get context_item_keys() {
    return Object.entries(this.data?.context_items || {})
      .filter(([key, item_data]) => !item_data.exclude)
      .map(([key, item_data]) => key)
    ;
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

  get name () {
    return this.data.name;
  }
  set name (name) {
    if (typeof name !== 'string') throw new TypeError('Name must be a string');
    const was_nameless = !this.data.name || String(this.data.name).trim().length === 0;
    this.data.name = name;
    if(was_nameless) this.emit_event('context:named');
    else this.emit_event('context:renamed', { name });
    this.queue_save();
  }
  get size () {
    let size = 0;
    Object.values(this.context_items.items || {})
      .forEach(item => {
        if (item.size) size += item.size;
      })
    ;
    return size;
  }
  get item_count () {
    return Object.entries(this.data?.context_items || {})
      .filter(([key, item_data]) => !item_data.exclude)
      .length
    ;
  }
  // v3
  async get_text(params = {}) {
    const segments = [];
    const context_items = this.context_items
      .filter(params.filter)
      .sort((a, b) => a.data.d - b.data.d) // sort by depth ascending
    ;
    console.log("get_text context_items", context_items);
    for (const item of context_items) {
      if (item.is_media) continue; 
      const item_text = await item.get_text();
      if(typeof item_text === 'string') segments.push(item_text);
      else this.emit_get_text_error(item, item_text);
    }
    const context_items_text = segments.join('\n');
    if (typeof this.actions.context_merge_template === 'function') {
      return await this.actions.context_merge_template(context_items_text, {context_items});
    }
    return context_items_text;
  }

  async get_media(params = {}) {
    const context_items = this.context_items.filter(params.filter);
    const out = [];
    for (const item of context_items) {
      if (!item.is_media) continue;
      const item_base64 = await item.get_base64();
      if(item_base64.error) this.emit_get_media_error(item, item_base64);
      else out.push(item_base64);
    }
    return out;
  }

  get context_items () {
    // 2026-01-16 REMOVED caching logic because causing cross-contamination issues
    // ex. when switching between contexts in Context Selector modal (from chat to external)
    // if(!this._context_items) {
      const config = this.env.config.collections.context_items;
      const Class = config.class;
      this._context_items = new Class(this.env, {...config, class: null});
      this._context_items.load_from_data(this.data.context_items || {});
      // if (!this._context_items_listener_registered) {
      //   let disposer;
      //   disposer = this.on_event('context:updated', () => {
      //     console.log('SmartContext: context updated, clearing context_items cache');
      //     delete this._context_items;
      //     this._context_items = null; // reset cache
      //     disposer();
      //     this._context_items_listener_registered = false;
      //   });
      //   this._context_items_listener_registered = true;
      // }
    // }
    return this._context_items;
  }

  /**
   * @private
   */
  emit_get_text_error(item, item_text) {
    this.emit_event('notification:error', {
      message: `Context item did not return text: ${item.key}`,
      ...(item_text && typeof item_text === 'object' ? item_text : {})
    });
  }
  /**
   * @private
   */
  emit_get_media_error(item, item_base64) {
    this.emit_event('notification:error', {
      message: `Context item did not return media: ${item.key}`,
      ...(item_base64 && typeof item_base64 === 'object' ? item_base64 : {})
    });
  }

}
