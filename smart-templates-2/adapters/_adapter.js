/**
 * @class TemplateSourceAdapter
 * @description Base adapter class for handling template source file operations.
 * Each subclass should override `import()` to parse or transform the file into `this.item.data`.
 */
export class TemplateSourceAdapter {
  /**
   * @constructor
   * @param {Object} item - The template item this adapter is associated with.
   */
  constructor(item) {
    this.item = item;
  }

  /**
   * Helper to read the raw file content. Usually used internally by `import()`.
   * @async
   * @returns {Promise<string>} The file contents.
   */
  async read() {
    return await this.fs.read(this.file_path);
  }

  /**
   * Helper to write raw data back to the file system.
   * @async
   * @param {string|Object} data - The data to write to the file
   * @returns {Promise<void>} Resolves when write completes
   */
  async write(data) {
    return await this.fs.write(this.file_path, data);
  }

  /**
   * The main method each adapter should override to parse or transform the file
   * and store the result in `this.item.data`.
   * @async
   * @returns {Promise<any>} The parsed or processed result
   */
  async import() {
    throw new Error('import() not implemented by subclass');
  }

  /**
   * For convenience, references to the file path and FS from the item.
   */
  get fs() {
    return this.item.collection.fs;
  }
  get file_path() {
    return this.item.path; // or logic to unify extension if needed
  }
}

export default {
  item: TemplateSourceAdapter,
}