import fs from 'fs';
import path from 'path';
const fs_promises = fs.promises;

/**
 * NodeFsSmartFsAdapter class
 * 
 * This class provides an adapter for the Node.js file system (fs) module to work with SmartFs.
 * It wraps fs methods and provides additional functionality for path resolution and error handling.
 * 
 * @class
 * @classdesc Adapter for Node.js file system operations compatible with SmartFs
 */
export class NodeFsSmartFsAdapter {
  constructor(smart_fs) {
    this.smart_fs = smart_fs;
  }

  /**
   * Resolve a relative path to an absolute path
   * 
   * @private
   * @param {string} rel_path - The relative path to resolve
   * @returns {string} The resolved absolute path
   */
  #resolve_path(rel_path) {
    if (rel_path.startsWith(this.smart_fs.env_path)) return rel_path;
    return path.join(this.smart_fs.env_path, rel_path);
  }

  /**
   * Wrap an asynchronous fs method
   * 
   * @private
   * @param {Function} method - The method to wrap
   * @param {number} [path_count=1] - The number of path arguments
   * @returns {Function} The wrapped method
   */
  #wrap_method(method, path_count = 1) {
    return async (...args) => {
      const paths = args.slice(0, path_count);
      const other_args = args.slice(path_count);
      const resolved_paths = paths.map(path => this.#resolve_path(path));
      let result = await method(...resolved_paths, ...other_args);
      return this.post_process(result);
    };
  }

  /**
   * Wrap a synchronous fs method
   * 
   * @private
   * @param {Function} method - The method to wrap
   * @param {number} [path_count=1] - The number of path arguments
   * @returns {Function} The wrapped method
   */
  #wrap_sync_method(method, path_count = 1) {
    return (...args) => {
      const paths = args.slice(0, path_count);
      const other_args = args.slice(path_count);
      const resolved_paths = paths.map(path => this.#resolve_path(path));
      let result = method(...resolved_paths, ...other_args);
      return this.post_process(result);
    };
  }

  // Wrapped fs methods
  appendFile = this.#wrap_method(fs_promises.appendFile);
  appendFileSync = this.#wrap_sync_method(fs.appendFileSync);
  // exists = this.#wrapMethod(fsPromises.access); // better handled by custom exists method
  existsSync = this.#wrap_sync_method(fs.existsSync);
  mkdir = this.#wrap_method(fs_promises.mkdir);
  mkdirSync = this.#wrap_sync_method(fs.mkdirSync);
  readdir = this.#wrap_method(fs_promises.readdir);
  readdirSync = this.#wrap_sync_method(fs.readdirSync);
  readFile = this.#wrap_method(fs_promises.readFile);
  readFileSync = this.#wrap_sync_method(fs.readFileSync);
  realpath = this.#wrap_method(fs_promises.realpath);
  realpathSync = this.#wrap_sync_method(fs.realpathSync);
  rename = this.#wrap_method(fs_promises.rename, 2);
  renameSync = this.#wrap_sync_method(fs.renameSync, 2);
  // rmdir = this.#wrapMethod(fsPromises.rmdir); // DEPRECATED
  // rmdirSync = this.#wrapSyncMethod(fs.rmdirSync); // DEPRECATED
  rmdir = this.#wrap_method(fs_promises.rm);
  rmdirSync = this.#wrap_sync_method(fs.rmSync);
  stat = this.#wrap_method(fs_promises.stat);
  statSync = this.#wrap_sync_method(fs.statSync);
  symlink = this.#wrap_method(fs_promises.symlink, 2);
  symlinkSync = this.#wrap_sync_method(fs.symlinkSync, 2);
  unlink = this.#wrap_method(fs_promises.unlink);
  unlinkSync = this.#wrap_sync_method(fs.unlinkSync);
  writeFile = this.#wrap_method(fs_promises.writeFile);
  writeFileSync = this.#wrap_sync_method(fs.writeFileSync);


  // v2 base methods
  /**
   * Append content to a file
   * @param {string} rel_path - Relative path to the file
   * @param {string|Buffer} content - Content to append
   * @returns {Promise<void>}
   */
  async append(rel_path, content) { return await this.appendFile(rel_path, content); }

  /**
   * Create a new directory
   * @param {string} rel_path - Relative path of the directory to create
   * @returns {Promise<void>}
   */
  async create_dir(rel_path) { return await this.mkdir(rel_path); }

  /**
   * Check if a file or directory exists
   * @param {string} rel_path - Relative path to check
   * @returns {Promise<boolean>}
   */
  async exists(rel_path) {
    try {
      await fs_promises.access(this.#resolve_path(rel_path));
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error; // Re-throw the error if it's not a 'file not found' error
    }
  }

  /**
   * List contents of a directory
   * @param {string} rel_path - Relative path of the directory to list
   * @returns {Promise<string[]>}
   */
  async list(rel_path) { return await this.readdir(rel_path); }

  /**
   * Read the contents of a file
   * @param {string} rel_path - Relative path of the file to read
   * @returns {Promise<string>}
   */
  async read(rel_path) { return await this.readFile(rel_path, 'utf-8'); }

  /**
   * Remove a file
   * @param {string} rel_path - Relative path of the file to remove
   * @returns {Promise<void>}
   */
  async remove(rel_path) { return await this.unlink(rel_path); }

  /**
   * Remove a directory
   * @param {string} rel_path - Relative path of the directory to remove
   * @returns {Promise<void>}
   */
  async remove_dir(rel_path) { return await this.rmdir(rel_path); }

  /**
   * Rename a file or directory
   * @param {string} rel_path - Current relative path
   * @param {string} new_rel_path - New relative path
   * @returns {Promise<void>}
   */
  async rename(rel_path, new_rel_path) { return await this.rename(rel_path, new_rel_path); }

  /**
   * Get file or directory stats
   * @param {string} rel_path - Relative path of the file or directory
   * @returns {Promise<fs.Stats>}
   */
  async stat(rel_path) { return await this.stat(rel_path); }

  /**
   * Write content to a file
   * @param {string} rel_path - Relative path of the file to write
   * @param {string|Buffer} content - Content to write
   * @returns {Promise<void>}
   */
  async write(rel_path, content) { return await this.writeFile(rel_path, content); }
}