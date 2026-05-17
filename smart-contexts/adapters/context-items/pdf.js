// @ts-check

import { ContextItemAdapter } from './_adapter.js';

/** @typedef {import('smart-types').ContextItemMediaResult} ContextItemMediaResult */
/** @typedef {import('smart-types').ContextItemAdapterSnapshot} ContextItemAdapterSnapshot */
/** @typedef {PdfContextItemAdapter & Object.<string, *> & {item: *}} PdfContextItemAdapterThis */

export class PdfContextItemAdapter extends ContextItemAdapter {
  /**
   * @param {*} key
   * @returns {boolean|string}
   */
  static detect(key) {
    if (String(key || '').toLowerCase().endsWith('.pdf')) return 'pdf';
    return false;
  }
  /**
   * @param {ContextItemAdapterSnapshot} snapshot
   * @returns {Promise<void>}
   */
  async add_to_snapshot(snapshot) {
    if (!snapshot.pdfs) snapshot.pdfs = [];
    snapshot.pdfs.push(this.item.key);
  }
  /**
   * @returns {string}
   */
  get icon_type() {
    return 'file-text';
  }
  /**
   * @returns {boolean}
   */
  get is_media() {
    return true;
  }
  /**
   * @this {PdfContextItemAdapterThis}
   * @returns {Promise<ContextItemMediaResult>}
   */
  async get_base64() {
    try {
      const base64_data = await this.item.env.fs.read(this.item.key, 'base64');
      const base64_url = `data:application/pdf;base64,${base64_data}`;
      return {
        type: 'pdf_url',
        key: this.item.key,
        name: this.item.key.split(/[\\/]/).pop(),
        url: base64_url
      };
    } catch (err) {
      console.warn(`Failed to convert PDF ${this.item.key} to base64`, err);
      return {error: `Failed to convert PDF to base64: ${err.message}`};
    }
  }
  /**
   * @this {PdfContextItemAdapterThis}
   * @returns {boolean}
   */
  get exists() {
    return this.item.env.smart_sources.fs.exists_sync(this.item.key);
  }
}
