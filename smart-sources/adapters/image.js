import { FileSourceContentAdapter } from "./_file.js";

export class ImageSourceContentAdapter extends FileSourceContentAdapter {

  /**
   * TODO:
   * - read returns base64 encoded image in object ({name, mime_type, content}) using this.fs (smart-fs)
   */

  get should_import() { return false; } // no import for now
}