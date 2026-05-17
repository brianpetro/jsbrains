// @ts-check

import { ContextItemAdapter } from './_adapter.js';

/** @typedef {SourceContextItemAdapter & Object.<string, *> & {item: *, env: *, ref: *}} SourceContextItemAdapterThis */

export class SourceContextItemAdapter extends ContextItemAdapter {
  static order = 7; // default lowest priority
  /**
   * @returns {boolean}
   */
  static detect(key) { return true; }

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
   * @returns {Promise<string>}
   */
  async get_text() {
    return await this.ref?.read() || 'MISSING SOURCE';
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
