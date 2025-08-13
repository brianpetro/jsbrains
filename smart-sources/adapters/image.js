import { FileSourceContentAdapter } from "./_file.js";
const image_extension_regex = /\.(png|jpe?g|gif|bmp|webp|svg|ico)$/i;

export class ImageSourceContentAdapter extends FileSourceContentAdapter {
  static detect_type(key) {
    return image_extension_regex.test(key);
  }

  /**
   * TODO:
   * - read returns base64 encoded image in object ({name, mime_type, content}) using this.fs (smart-fs)
   */

  get should_import() { return false; } // no import for now
}