import { FileSourceContentAdapter } from "./_file.js";
const media_extension_regex = /\.(png|jpe?g|gif|bmp|webp|svg|ico|mp4|pdf)$/i;

export class MediaSourceContentAdapter extends FileSourceContentAdapter {
  static detect_type(key) {
    return media_extension_regex.test(key);
  }

  /**
   * TODO:
   * - read returns base64 encoded media in object ({name, mime_type, content}) using this.fs (smart-fs)
   */

  get should_import() { return false; } // no import for now
}