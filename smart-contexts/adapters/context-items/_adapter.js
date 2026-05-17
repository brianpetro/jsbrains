// @ts-check

/** @typedef {import('smart-types').ContextItemData} ContextItemData */
/** @typedef {import('smart-types').ContextItemTextResult} ContextItemTextResult */
/** @typedef {Object.<string, *> & {item: *, env: *}} ContextItemAdapterThis */

export class ContextItemAdapter {
  /**
   * @param {*} item
   */
  constructor(item) {
    this.item = item;
  }
  /**
   * @param {string} key
   * @param {ContextItemData} [data={}]
   * @returns {boolean|string}
   */
  static detect(key, data={}) { return false; }
  /**
   * @this {ContextItemAdapterThis}
   * @returns {*}
   */
  get env() { return this.item.env; }
  /**
   * @returns {boolean}
   */
  get exists() { return true; }
  /**
   * @returns {string|null}
   */
  get icon_type() { return null; }

  // v3 API
  /**
   * for calculating context size
   * @returns {number}
   */
  get size () { return 0; }

  /**
   * @returns {Promise<ContextItemTextResult>}
   */
  async get_text() {}

  /**
   * @returns {Promise<*>}
   */
  async open () {}

}
