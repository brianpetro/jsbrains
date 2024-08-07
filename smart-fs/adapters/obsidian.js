/**
 * ObsidianSmartFsAdapter class
 * 
 * This class provides an adapter for the Obsidian vault adapter to work with SmartFs.
 * It wraps Obsidian vault adapter methods for file system operations.
 * 
 * @class
 * @classdesc Adapter for Obsidian vault file system operations compatible with SmartFs
 */
export class ObsidianSmartFsAdapter {
  /**
   * Create an ObsidianSmartFsAdapter instance
   * 
   * @param {Object} smart_fs - The SmartFs instance
   */
  constructor(smart_fs) {
    // scoped to env_path by default
    this.obsidian_adapter = smart_fs.env.main.app.vault.adapter;
  }

  /**
   * Append content to a file
   * 
   * @param {string} rel_path - The relative path of the file to append to
   * @param {string} data - The content to append
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async append(rel_path, data) {
    return await this.obsidian_adapter.append(rel_path, data);
  }

  /**
   * Create a new directory
   * 
   * @param {string} rel_path - The relative path of the directory to create
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async create_dir(rel_path) {
    return await this.obsidian_adapter.mkdir(rel_path);
  }

  /**
   * Check if a file or directory exists
   * 
   * @param {string} rel_path - The relative path to check
   * @returns {Promise<boolean>} True if the path exists, false otherwise
   */
  async exists(rel_path) {
    return await this.obsidian_adapter.exists(rel_path);
  }

  /**
   * List files in a directory
   * 
   * @param {string} rel_path - The relative path to list
   * @returns {Promise<string[]>} Array of file paths
   */
  async list(rel_path) {
    return await this.obsidian_adapter.list(rel_path);
  }

  /**
   * Read the contents of a file
   * 
   * @param {string} rel_path - The relative path of the file to read
   * @returns {Promise<string>} The contents of the file
   */
  async read(rel_path) {
    return await this.obsidian_adapter.read(rel_path);
  }

  /**
   * Rename a file or directory
   * 
   * @param {string} old_path - The current path of the file or directory
   * @param {string} new_path - The new path for the file or directory
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async rename(old_path, new_path) {
    return await this.obsidian_adapter.rename(old_path, new_path);
  }

  /**
   * Remove a file
   * 
   * @param {string} rel_path - The relative path of the file to remove
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async remove(rel_path) {
    return await this.obsidian_adapter.remove(rel_path);
  }

  /**
   * Remove a directory
   * 
   * @param {string} rel_path - The relative path of the directory to remove
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async remove_dir(rel_path) {
    return await this.obsidian_adapter.rmdir(rel_path);
  }

  /**
   * Get file or directory information
   * 
   * @param {string} rel_path - The relative path of the file or directory
   * @returns {Promise<Object>} An object containing file or directory information
   */
  async stat(rel_path) {
    return await this.obsidian_adapter.stat(rel_path);
  }

  /**
   * Write content to a file
   * 
   * @param {string} rel_path - The relative path of the file to write to
   * @param {string} data - The content to write
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async write(rel_path, data) {
    return await this.obsidian_adapter.write(rel_path, data);
  }
}