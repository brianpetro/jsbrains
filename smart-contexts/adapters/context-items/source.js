// @ts-check

import { ContextItemAdapter } from './_adapter.js';

/** @typedef {SourceContextItemAdapter & Object.<string, *> & {item: *, env: *, ref: *}} SourceContextItemAdapterThis */

export class SourceContextItemAdapter extends ContextItemAdapter {
  static order = 7; // default lowest priority
  /**
   * @param {string} key
   * @param {object} [data={}]
   * @returns {boolean}
   */
  static detect(key, data = {}) { return data.kind === 'source'; }

  /**
   * @this {SourceContextItemAdapterThis}
   * @returns {*}
   */
  get ref() { return this.env.smart_sources.get(this.item.key); }
  /**
   * @this {SourceContextItemAdapterThis}
   * @returns {Array<*>}
   */
  get inlinks() { return this.ref.inlinks || []; }
  /**
   * @this {SourceContextItemAdapterThis}
   * @returns {Array<*>}
   */
  get outlinks() { return this.ref.outlinks || []; }
  /**
   * @this {SourceContextItemAdapterThis}
   * @returns {boolean}
   */
  get exists() { return !!(this.ref && !this.ref.is_gone); }

  /**
   * @this {SourceContextItemAdapterThis}
   * @returns {number}
   */
  get size () {
    return this.ref?.size || 0;
  }
  /**
   * @this {SourceContextItemAdapterThis}
   * @returns {number|null}
   */
  get mtime() {
    return this.ref?.mtime || null;
  }
  /**
   * @this {SourceContextItemAdapterThis}
   * @param {object} [params={}]
   * @param {boolean} [params.throw_on_error=false]
   * @returns {Promise<string>}
   */
  async get_text(params = {}) {
    if (!this.exists) {
      if (params.throw_on_error) throw new Error(`Source not found: ${this.item.key}`);
      return 'MISSING SOURCE';
    }
    try {
      const item_text = await this.ref.read({ throw_on_error: true });
      if (params.throw_on_error && item_text == null) throw new Error(`Unable to read source: ${this.item.key}`);
      return item_text === null || item_text === undefined
        ? 'ERROR READING SOURCE'
        : item_text
      ;
    } catch (error) {
      if (params.throw_on_error) throw error;
      return 'ERROR READING SOURCE';
    }
  }
  /**
   * @this {SourceContextItemAdapterThis}
   * @param {*} [event=null]
   * @returns {Promise<void>}
   */
  async open(event = null) {
    this.ref.actions.source_open(event);
  }
}
