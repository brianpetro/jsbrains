import { FileSourceContentAdapter } from "./_file.js";

const media_extension_regex = /\.(png|jpe?g|gif|bmp|webp|svg|ico|mp4|webm|pdf|mp3|wav|ogg|flac|aac)$/i;
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
  webm: 'video/webm',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac'
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

/**
 * Determine if a key references a supported media file.
 * @param {string} key - Source key or filename.
 * @returns {boolean} True when extension matches known media types.
 */
export const is_media_key = key => media_extension_regex.test(key);

export class MediaSourceContentAdapter extends FileSourceContentAdapter {
  static detect_type(source) {
    return is_media_key(source.key);
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
