// @ts-check

/**
 * @file smart_context.js
 *
 * A single SmartContext item that references multiple data sources (files, blocks, directories, etc.)
 * to compile a final contextual output. Actual compilation is now handled by adapters in ./adapters/.
 */

import { CollectionItem } from 'smart-collections';

/** @typedef {import('./context_items.js').ContextItems} ContextItems */
/** @typedef {import('./context_item.js').ContextItem} ContextItem */
/** @typedef {import('smart-types').SmartContextData} SmartContextData */
/** @typedef {import('smart-types').ContextItemData} ContextItemData */
/** @typedef {import('smart-types').ContextItemsData} ContextItemsData */
/** @typedef {import('smart-types').SmartContextAddItemParams} SmartContextAddItemParams */
/** @typedef {import('smart-types').SmartContextRemoveItemParams} SmartContextRemoveItemParams */
/** @typedef {import('smart-types').SmartContextMissingItemParams} SmartContextMissingItemParams */
/** @typedef {import('smart-types').ContextItemMediaResult} ContextItemMediaResult */
/** @typedef {import('smart-types').ContextItemTextResult} ContextItemTextResult */
/** @typedef {import('smart-types').ContextMediaPayload} ContextMediaPayload */
/** @typedef {ContextItem & Object.<string, *> & {env: *, data: ContextItemData & Object.<string, *>, key: string, collection: *, context_type_adapter: *, is_media: boolean, size: number, mtime: number, get_text: function(): Promise<ContextItemTextResult>, get_base64: function(): Promise<ContextItemMediaResult>}} ContextItemInstance */
/** @typedef {Object.<string, *> & {items: Object.<string, ContextItemInstance>, filter: Function}} ContextItemsInstance */
/** @typedef {SmartContext & Object.<string, *> & {data: SmartContextData & Object.<string, *>, env: *, collection: *, context_items: ContextItemsInstance, actions: Object.<string, *>, key: string, _missing_context_item_event_timers: Map<string, *>}} SmartContextThis */

/**
 * Prevents deletion from data (maintained as excluded instead of simple removal) for items that are
 * derived from folders or named contexts.
 *
 * Once a derived item is already excluded, a second remove should delete the exclusion marker so the
 * builder can expose a reversible "remove exclusion" action.
 *
 * @param {ContextItemsData} context_items
 * @param {string} key
 * @deprecated Is this deprecated???? 2026-03-24 (see remove_by_path for latest handling)
 * @returns {boolean}
 */
const remove_context_item_data = (context_items, key) => {
  if (!key || !context_items?.[key]) return false;

  const item_data = context_items[key];
  if (item_data.folder || item_data.from_named_context) {
    if (item_data.exclude) {
      delete context_items[key];
      return true;
    }
    item_data.exclude = true;
    return true;
  }

  delete context_items[key];
  return true;
};

export class SmartContext extends CollectionItem {
  static version = '2.0.2';

  /**
   * @returns {{data: SmartContextData}}
   */
  static get defaults() {
    return {
      data: {
        key: '',
        context_items: {},
        context_opts: {}, // REMOVE?
      },
    };
  }

  // queue_save to debounce process save queue
  /**
   * @this {*}
   * @returns {void}
   */
  queue_save() {
    super.queue_save();
    this.collection.queue_save();
  }

  /**
   * add_item
   * @this {SmartContextThis}
   * @param {string|Object.<string, *>} item
   * @param {SmartContextAddItemParams} [params={}]
   * @returns {void|*}
   */
  add_item(item, params = {}) {
    const {
      emit_updated = true,
    } = params;
    let key;
    if (typeof item === 'object') {
      key = item.key || item.path;
    } else {
      key = item;
    }
    const existing = this.data.context_items[key];
    const context_item = {
      d: 0,
      at: Date.now(),
      ...(existing || {}),
      ...(typeof item === 'object' ? item : {}),
    };
    if (!key) return console.error('SmartContext: add_item called with invalid item', item);
    this.data.context_items[key] = context_item;
    this.queue_save();
    if (emit_updated) this.emit_event('context:updated', { add_item: key });
  }

  /**
   * add_items
   * @this {SmartContextThis}
   * @param {Array<string|Object.<string, *>>|string|Object.<string, *>} items
   * @returns {void}
   */
  add_items(items) {
    if (!Array.isArray(items)) items = [items];
    items.forEach((item) => this.add_item(item, { emit_updated: false }));
    this.emit_event('context:updated', {
      added_items: items.map((item) => (typeof item === 'object' ? item.key || item.path : item)),
    });
  }

  /**
   * remove_item
   * Removes a path/ref from context and emits context:updated
   * @this {SmartContextThis}
   * @param {string} key
   * @param {SmartContextRemoveItemParams} params
   * @returns {void}
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
   * @this {SmartContextThis}
   * @param {string[]|string} keys
   * @param {SmartContextRemoveItemParams} params
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

  /**
   * @this {SmartContextThis}
   * @returns {void}
   */
  clear_all() {
    this.data.context_items = {};
    this.queue_save();
    this.emit_event('context:updated', { cleared: true });
  }

  /**
   * @this {SmartContextThis}
   * @returns {string[]}
   */
  get context_item_keys() {
    return Object.entries(this.data?.context_items || {})
      .filter(([, item_data]) => !item_data.exclude)
      .map(([key]) => key)
    ;
  }

  /**
   * @this {SmartContextThis}
   * @returns {string[]}
   */
  get excluded_context_item_keys() {
    return Object.entries(this.data?.context_items || {})
      .filter(([, item_data]) => item_data?.exclude)
      .map(([key]) => key)
    ;
  }

  /**
   * @this {SmartContextThis}
   * @returns {string}
   */
  get key() {
    if (!this.data.key) {
      this.data.key = Date.now().toString();
    }
    return this.data.key;
  }

  /**
   * @this {SmartContextThis}
   * @returns {boolean}
   */
  get has_context_items() {
    return this.item_count > 0;
  }

  /**
   * @this {SmartContextThis}
   * @returns {boolean}
   */
  get has_excluded_context_items() {
    return this.excluded_item_count > 0;
  }

  /**
   * @this {SmartContextThis}
   * @returns {number}
   */
  get excluded_item_count() {
    return this.excluded_context_item_keys.length;
  }

  /**
   * @this {*}
   * @returns {*}
   */
  get name() {
    return this.data.name;
  }

  /**
   * @this {*}
   * @param {string} name
   */
  set name(name) {
    if (typeof name !== 'string') throw new TypeError('Name must be a string');
    const previous_name = typeof this.data.name === 'string' ? this.data.name : '';
    const was_nameless = !previous_name || String(previous_name).trim().length === 0;
    this.data.name = name;
    if (was_nameless) {
      this.emit_info_event('context:named', { name });
    } else {
      this.emit_info_event('context:renamed', {
        old_name: previous_name,
        name,
      });
    }
    this.queue_save();
  }

  /**
   * @this {SmartContextThis}
   * @returns {number}
   */
  get size() {
    let size = 0;
    Object.values(this.context_items.items || {})
      .forEach((item) => {
        if (item.size) size += item.size;
      })
    ;
    return size;
  }

  /**
   * @this {SmartContextThis}
   * @returns {number}
   */
  get item_count() {
    return Object.entries(this.data?.context_items || {})
      .filter(([, item_data]) => !item_data.exclude)
      .length
    ;
  }

  // v3
  /**
   * @this {SmartContextThis}
   * @param {Object.<string, *>} [params={}]
   * @returns {Promise<string>}
   */
  async get_text(params = {}) {
    const segments = [];
    const context_items = this.context_items
      .filter(params.filter)
      .sort((a, b) => a.data.d - b.data.d)
    ;
    console.log('get_text context_items', context_items);
    for (const item of context_items) {
      if (item.is_media) continue;
      const item_text = await item.get_text();
      if (typeof item_text === 'string') segments.push(item_text);
      else this.emit_get_text_error(item, item_text);
    }
    const context_items_text = segments.join('\n');
    if (typeof this.actions.context_merge_template === 'function') {
      return await this.actions.context_merge_template(context_items_text, { context_items });
    }
    return context_items_text;
  }
  /**
   * Build a ContextItems collection on demand.
   *
   * The builder sometimes needs excluded entries in addition to active items,
   * so this helper accepts the same params consumed by
   * ContextItems.load_from_data(...).
   *
   * @this {SmartContextThis}
   * @param {Object.<string, *>} [params={}]
   * @returns {ContextItemsInstance}
   */
  get_context_items(params = {}) {
    const config = this.env.config.collections.context_items;
    const Class = config.class;
    const context_items = new Class(this, { ...config, class: null });
    context_items.load_from_data(this.data.context_items || {}, params);
    return context_items;
  }

  /**
   * @this {SmartContextThis}
   * @returns {ContextItemsInstance}
   */
  get context_items() {
    return this.get_context_items();
  }

  /**
   * @private
   * @this {SmartContextThis}
   * @param {*} item
   * @param {ContextItemTextResult} item_text
   * @returns {void}
   */
  emit_get_text_error(item, item_text) {
    this.emit_event('notification:error', {
      message: `Context item did not return text: ${item.key}`,
      ...(item_text && typeof item_text === 'object' ? item_text : {}),
    });
  }


  /**
   * Move below to pro subclass
   * @this {SmartContextThis}
   * @param {Object.<string, *>} [params={}]
   * @returns {Promise<ContextMediaPayload[]>}
   */
  async get_media(params = {}) {
    const context_items = this.context_items.filter(params.filter);
    const out = [];
    for (const item of context_items) {
      if (!item.is_media) continue;
      const item_base64 = await item.get_base64();
      if (item_base64.error) this.emit_get_media_error(item, item_base64);
      else out.push(item_base64);
    }
    return out;
  }
  /**
   * @private
   * @this {SmartContextThis}
   * @param {*} item
   * @param {ContextItemMediaResult} item_base64
   * @returns {void}
   */
  emit_get_media_error(item, item_base64) {
    this.emit_event('notification:error', {
      message: `Context item did not return media: ${item.key}`,
      ...(item_base64 && typeof item_base64 === 'object' ? item_base64 : {}),
    });
  }

  /**
   * Emit a missing-context-item warning once a burst of context_items hydration settles.
   *
   * ContextItems collections are rebuilt often by render paths, so debounce on the
   * durable SmartContext instance to avoid duplicate native notices for the same
   * missing item.
   *
   * @this {SmartContextThis}
   * @param {string} key
   * @param {Error|string} error
   * @param {SmartContextMissingItemParams} [params={}]
   * @returns {void}
   */
  emit_missing_context_item_event(key, error, params = {}) {
    const missing_key = String(key || '').trim();
    if (!missing_key) return;

    if (!(this._missing_context_item_event_timers instanceof Map)) {
      this._missing_context_item_event_timers = new Map();
    }

    const existing_timer = this._missing_context_item_event_timers.get(missing_key);
    if (existing_timer) clearTimeout(existing_timer);

    const raw_debounce_ms = Number.isFinite(params.debounce_ms)
      ? params.debounce_ms
      : 250
    ;
    const debounce_ms = Math.max(0, raw_debounce_ms);

    const timer = setTimeout(() => {
      this._missing_context_item_event_timers.delete(missing_key);
      if (!this.data?.context_items?.[missing_key]) return;

      this.emit_warning_event('smart_context:missing_item', {
        message: params.message || 'Failed to find context item: ' + missing_key,
        missing_key,
        context_key: this.key,
        error: error?.toString?.() || String(error || ''),
        btn_text: params.btn_text || 'Remove missing item',
        btn_callback: 'smart_contexts:remove_missing_item', // should be able to be removed once notifications feed modal detects btn_event_key and btn_event_payload as valid action (to show button)
        btn_event_key: 'smart_contexts:remove_missing_item',
        btn_event_payload: {
          collection_key: 'smart_contexts',
          item_key: this.key,
          missing_key,
        },
      });
    }, debounce_ms);

    this._missing_context_item_event_timers.set(missing_key, timer);
  }
}
