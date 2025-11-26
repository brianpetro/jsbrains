import { ContextItemAdapter } from './_adapter.js';
import { image_extension_regex } from 'smart-contexts/utils/image_extension_regex.js';

export class ImageContextItemAdapter extends ContextItemAdapter {
  static detect(key) {
    if (image_extension_regex.test(key)) return 'image';
    return false;
  }
  get exists() {
    return this.item.env.smart_sources.fs.exists_sync(this.item.key);
  }
  get is_media() {
    return true;
  }

  async get_base64() {
    const ext = this.item.key.split('.').pop().toLowerCase();
    try {
      const base64_data = await this.item.env.fs.read(this.item.key, 'base64');
      const base64_url = `data:image/${ext};base64,${base64_data}`;
      return {
        type: 'image_url',
        key: this.item.key,
        name: this.item.key.split(/[\\/]/).pop(),
        url: base64_url
      };
    } catch (err) {
      console.warn(`Failed to convert image ${this.item.key} to base64`, err);
      return {error: `Failed to convert image to base64: ${err.message}`};
    }
  }

}
