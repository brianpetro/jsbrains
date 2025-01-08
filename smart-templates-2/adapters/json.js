import { TemplateSourceAdapter } from "./_adapter.js";

/**
 * @class FileJsonTemplateSourceAdapter
 * @extends TemplateSourceAdapter
 * @description Adapter for handling JSON template source files with parsing and stringification
 */
export class FileJsonTemplateSourceAdapter extends TemplateSourceAdapter {
  /** @type {string} The file extension for JSON files */
  static extension = 'json';
  /** @type {string} Instance-level file extension */
  extension = 'json';

  /**
   * @async
   * @method import
   * @description Reads and parses JSON data, merges result into `this.item.data`.
   * @returns {Promise<Object>} The parsed JSON object.
   */
  async import() {
    const dataRaw = await this.read();
    const parsed = JSON.parse(dataRaw);

    // Merge into item.data (up to you how you store it)
    Object.assign(this.item.data, parsed);

    return parsed;
  }

  /**
   * Write data object as JSON to the file
   * @async
   * @param {Object} data - The data to stringify and write
   * @returns {Promise<void>}
   */
  async write(data) {
    const jsonStr = JSON.stringify(data, null, 2);
    return super.write(jsonStr);
  }
}

export default {
  item: FileJsonTemplateSourceAdapter
};
