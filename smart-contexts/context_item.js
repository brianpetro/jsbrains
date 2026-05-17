// @ts-check

import { CollectionItem } from 'smart-collections';

/** @typedef {import('smart-types').ContextItemData} ContextItemData */
/** @typedef {import('smart-types').ContextItemMediaResult} ContextItemMediaResult */
/** @typedef {import('smart-types').ContextItemTextResult} ContextItemTextResult */
/** @typedef {import('smart-types').CollectionItemRef} CollectionItemRef */
/** @typedef {ContextItem & Object.<string, *> & {data: ContextItemData, key: string, collection: *, context_type_adapter: *}} ContextItemThis */

export class ContextItem extends CollectionItem {
  static version = '1.1.0';
  // special handling because current name_to_collection_key removes "Items" suffix
  /**
   * @returns {string}
   */
  get collection_key () {
    return 'context_items';
  }
  /**
   * @this {ContextItemThis}
   * @returns {*}
   */
  get context_type_adapter() {
    if (!this._context_type_adapter) {
      const Class = this.collection.context_item_adapters.find(adapter_class => adapter_class.detect(this.key, this.data));
      if (!Class) throw new Error(`No context item adapter found for key: ${this.key}`);
      this._context_type_adapter = new Class(this);
    }
    return this._context_type_adapter;
  }

  /**
   * @this {ContextItemThis}
   * @returns {boolean}
   */
  get exists() {
    return this.context_type_adapter.exists;
  }

  /**
   * @this {ContextItemThis}
   * @returns {string|null}
   */
  get icon_type() {
    return this.context_type_adapter.icon_type || null;
  }

  // v3
  /**
   * @this {ContextItemThis}
   * @returns {Promise<ContextItemTextResult>}
   */
  async get_text() {
    const item_text = await this.context_type_adapter.get_text();
    if (typeof item_text !== 'string') return item_text;
    if (typeof this.actions.context_item_merge_template === 'function') {
      return await this.actions.context_item_merge_template(item_text);
    }
    return item_text;
  }
  /**
   * @this {ContextItemThis}
   * @returns {Promise<ContextItemMediaResult>}
   */
  async get_base64() {
    if (this.is_media) {
      return await this.context_type_adapter.get_base64();
    }
    return {error: `Context item is not media type: ${this.key}`};
  }
  /**
   * @this {ContextItemThis}
   * @param {*} [event=null]
   * @returns {Promise<*>}
   */
  async open (event = null) {
    return await this.context_type_adapter.open(event);
  }

  /**
   * @this {ContextItemThis}
   * @returns {boolean}
   */
  get is_media() {
    return this.context_type_adapter.is_media || false;
  }
  /**
   * @this {ContextItemThis}
   * @returns {CollectionItemRef|null}
   */
  get item_ref () {
    return this.context_type_adapter.ref || null;
  }
  /**
   * @this {ContextItemThis}
   * @returns {number}
   */
  get size () {
    return this.data.size || this.context_type_adapter.size || 0;
  }
  /**
   * @this {ContextItemThis}
   * @returns {number|null}
   */
  get mtime() {
    return this.data.mtime || this.context_type_adapter.mtime || null;
  }
}

