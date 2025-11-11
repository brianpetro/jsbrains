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

  // DEPRECATED
  async add_to_snapshot(snapshot) {
    if (!snapshot.images) snapshot.images = [];
    snapshot.images.push(this.item.key);
  }
}
