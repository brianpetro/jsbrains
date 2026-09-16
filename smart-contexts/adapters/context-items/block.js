// @ts-check

import { ContextItemAdapter } from './_adapter.js';

/** @typedef {BlockContextItemAdapter & Object.<string, *> & {item: *, env: *, ref: *}} BlockContextItemAdapterThis */

export class BlockContextItemAdapter extends ContextItemAdapter {
  static order = 6;
  /**
   * @param {string} key
   * @param {object} [data={}]
   * @returns {boolean}
   */
  static detect(key, data = {}) {
    return data.kind === 'block';
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
   * @param {object} [params={}]
   * @param {boolean} [params.throw_on_error=false]
   * @returns {Promise<string|Object.<string, *>>}
   */
  async get_text(params = {}) {
    const block = this.ref;
    if(!block) return { error: 'Block not found' };
    return await block.read(params);
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
