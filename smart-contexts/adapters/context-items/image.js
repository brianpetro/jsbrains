// @ts-check

import { ContextItemAdapter } from './_adapter.js';
import { image_extension_regex } from 'smart-contexts/utils/image_extension_regex.js';

/** @typedef {import('smart-types').ContextItemMediaResult} ContextItemMediaResult */
/** @typedef {ImageContextItemAdapter & Object.<string, *> & {item: *}} ImageContextItemAdapterThis */

export class ImageContextItemAdapter extends ContextItemAdapter {
  /**
   * @param {string} key
   * @param {object} [data={}]
   * @returns {boolean|string}
   */
  static detect(key, data = {}) {
    if (data.kind !== 'source') return false;
    if (image_extension_regex.test(data.source_path || key)) return 'image';
    return false;
  }
  /**
   * @this {ImageContextItemAdapterThis}
   * @returns {boolean}
   */
  get exists() {
    return this.item.env.smart_sources.fs.exists_sync(this.item.data?.source_path || this.item.key);
  }
  /**
   * @returns {string}
   */
  get icon_type() {
    return 'image-file';
  }
  /**
   * @returns {boolean}
   */
  get is_media() {
    return true;
  }

  /**
   * @this {ImageContextItemAdapterThis}
   * @returns {Promise<ContextItemMediaResult>}
   */
  async get_base64() {
    const source_path = this.item.data?.source_path || this.item.key;
    const ext = source_path.split('.').pop().toLowerCase();
    try {
      const base64_data = await this.item.env.fs.read(source_path, 'base64');
      const base64_url = `data:image/${ext};base64,${base64_data}`;
      return {
        type: 'image_url',
        key: this.item.key,
        name: source_path.split(/[\\/]/).pop(),
        url: base64_url
      };
    } catch (err) {
      console.warn(`Failed to convert image ${this.item.key} to base64`, err);
      return {error: `Failed to convert image to base64: ${err.message}`};
    }
  }

}
