/**
 * @class TemplateSourceAdapter
 * @description Base adapter class for handling template source file operations
 */
export class TemplateSourceAdapter {
  /**
   * @constructor
   * @param {Object} item - The template item to be adapted
   */
  constructor(item) {
    this.item = item;
  }

  /**
   * @async
   * @returns {Promise<string>} The contents of the file
   * @description Reads the contents of the template file
   */
  async read() {
    return await this.fs.read(this.file_path);
  }

  /**
   * @async
   * @param {string|Object} data - The data to write to the file
   * @returns {Promise<void>} Promise that resolves when write is complete
   * @description Writes data to the template file
   */
  async write(data) {
    return await this.fs.write(this.file_path, data);
  }
}