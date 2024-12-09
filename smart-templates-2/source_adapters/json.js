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
   * @returns {Promise<Object>} Parsed JSON data from the file
   * @description Reads and parses JSON data from the template file
   */
  async read() {
    const data = await super.read();
    return JSON.parse(data);
  }

  /**
   * @async
   * @param {Object} data - The data to stringify and write
   * @returns {Promise<void>} Promise that resolves when write is complete
   * @description Stringifies and writes JSON data to the template file
   */
  async write(data) {
    return await super.write(JSON.stringify(data, null, 2));
  }
}
