import { FileSourceContentAdapter } from "./_file.js";

const media_extension_regex = /\.(png|jpe?g|gif|bmp|webp|svg|ico|mp4|pdf)$/i;
const mime_types = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  pdf: 'application/pdf'
};

/**
 * Infer MIME type from file name.
 * @param {string} name - File name including extension.
 * @returns {string} Corresponding MIME type.
 */
export const infer_mime_type = name => {
  const ext = name.split('.').pop().toLowerCase();
  return mime_types[ext] || 'application/octet-stream';
};

export class MediaSourceContentAdapter extends FileSourceContentAdapter {
  static detect_type(key) {
    return media_extension_regex.test(key);
  }

  /**
   * Read media file and return base64 encoded content.
   * @async
   * @returns {Promise<{name: string, mime_type: string, content: string}>}
   */
  async read() {
    const name = this.item.file?.name || this.file_path.split('/').pop();
    const content = await this.fs.read(this.file_path, 'base64');
    this.data.last_read = {
      hash: this.create_hash(content || ""),
      at: Date.now(),
    };
    return {
      name,
      mime_type: infer_mime_type(name),
      content,
    };
  }

  get should_import() { return false; } // no import for now
}

export default {
  collection: null,
  item: MediaSourceContentAdapter
};
