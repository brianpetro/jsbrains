// @ts-check

import { ContextItemAdapter } from './_adapter.js';

/** @typedef {import('smart-types').ContextItemMediaResult} ContextItemMediaResult */
/** @typedef {import('smart-types').ContextItemAdapterSnapshot} ContextItemAdapterSnapshot */
/** @typedef {PdfContextItemAdapter & Object.<string, *> & {item: *}} PdfContextItemAdapterThis */

export class PdfContextItemAdapter extends ContextItemAdapter {
  /**
   * @param {*} key
   * @param {object} [data={}]
   * @returns {boolean|string}
   */
  static detect(key, data = {}) {
    if (data.kind !== 'source') return false;
    if (String(data.source_path || key || '').toLowerCase().endsWith('.pdf')) return 'pdf';
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
    const source_path = this.item.data?.source_path || this.item.key;
    try {
      const base64_data = await this.item.env.fs.read(source_path, 'base64');
      const base64_url = `data:application/pdf;base64,${base64_data}`;
      return {
        type: 'pdf_url',
        key: this.item.key,
        name: source_path.split(/[\\/]/).pop(),
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
    return this.item.env.smart_sources.fs.exists_sync(this.item.data?.source_path || this.item.key);
  }
}
