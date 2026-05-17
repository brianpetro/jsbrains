// @ts-check

import { ContextItemAdapter } from './_adapter.js';

/** @typedef {BlockContextItemAdapter & Object.<string, *> & {item: *, env: *, ref: *}} BlockContextItemAdapterThis */

export class BlockContextItemAdapter extends ContextItemAdapter {
  static order = 6;
  /**
   * @param {string} key
   * @returns {boolean}
   */
  static detect(key) {
    return key.includes('#');
  }

  /**
   * @this {BlockContextItemAdapterThis}
   * @returns {*}
   */
  get ref() { return this.env.smart_blocks.get(this.item.key); }
  /**
   * @this {BlockContextItemAdapterThis}
   * @returns {Array<*>}
   */
  get inlinks() { return this.ref.inlinks || []; }
  /**
   * @this {BlockContextItemAdapterThis}
   * @returns {Array<*>}
   */
  get outlinks() { return this.ref.outlinks || []; }
  /**
   * @this {BlockContextItemAdapterThis}
   * @returns {boolean}
   */
  get exists() { return !!(this.ref && !this.ref.is_gone); }
  /**
   * @this {BlockContextItemAdapterThis}
   * @returns {number|null}
   */
  get mtime() {
    return this.ref?.mtime || null;
  }
  /**
   * @this {BlockContextItemAdapterThis}
   * @returns {number}
   */
  get size () {
    return this.ref?.size || 0;
  }
  /**
   * @this {BlockContextItemAdapterThis}
   * @returns {Promise<string|Object.<string, *>>}
   */
  async get_text() {
    const block = this.ref;
    if(!block) return { error: 'Block not found' };
    return await block.read();
  }
  /**
   * @this {BlockContextItemAdapterThis}
   * @param {*} [event=null]
   * @returns {Promise<void>}
   */
  async open(event = null) {
    this.ref.actions.source_open(event);
  }

}
