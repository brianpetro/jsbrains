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
  get_file(file_path){
    const file = {};
    file.path = file_path
      .replace(/\\/g, '/') // normalize slashes
      .replace(this.smart_fs.fs_path, '') // remove fs_path
      .replace(/^\//, '') // remove leading slash
    ;
    file.type = 'file';
    file.extension = file.path.split('.').pop().toLowerCase();
    file.name = file.path.split('/').pop();
    file.basename = file.name.split('.').shift();
    Object.defineProperty(file, 'stat', {
      get: () => {
        const stat = this.statSync(file_path);
        return {
          ctime: stat.ctime.getTime(),
          mtime: stat.mtime.getTime(),
          size: stat.size,
        };
      }
    });
    return file;
  }

  /**
   * Resolve a relative path to an absolute path
   * 
   * @private
   * @param {string} rel_path - The relative path to resolve
   * @returns {string} The resolved absolute path
   */
  #resolve_path(rel_path) {
    if (rel_path.startsWith(this.smart_fs.fs_path)) return rel_path;
    return path.join(this.smart_fs.fs_path, rel_path);
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
      // return this.smart_fs.post_process(result); // handled by smart_fs.use_adapter
      return result;
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
      // return this.smart_fs.post_process(result); // handled by smart_fs.use_adapter
      return result;
    };
  }

  // Wrapped fs methods
  appendFile = this.#wrap_method(fs_promises.appendFile);
  appendFileSync = this.#wrap_sync_method(fs.appendFileSync);
  // exists = this.#wrapMethod(fsPromises.access); // better handled by custom exists method
  existsSync = this.#wrap_sync_method(fs.existsSync);
  #mkdir = this.#wrap_method(fs_promises.mkdir);
  mkdirSync = this.#wrap_sync_method(fs.mkdirSync);
  readdir = this.#wrap_method(fs_promises.readdir);
  readdirSync = this.#wrap_sync_method(fs.readdirSync);
  readFile = this.#wrap_method(fs_promises.readFile);
  readFileSync = this.#wrap_sync_method(fs.readFileSync);
  realpath = this.#wrap_method(fs_promises.realpath);
  realpathSync = this.#wrap_sync_method(fs.realpathSync);
  #rename = this.#wrap_method(fs_promises.rename, 2);
  renameSync = this.#wrap_sync_method(fs.renameSync, 2);
  // rmdir = this.#wrapMethod(fsPromises.rmdir); // DEPRECATED
  // rmdirSync = this.#wrapSyncMethod(fs.rmdirSync); // DEPRECATED
  rmdir = this.#wrap_method(fs_promises.rm);
  rmdirSync = this.#wrap_sync_method(fs.rmSync);
  #stat = this.#wrap_method(fs_promises.stat);
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
  async mkdir(rel_path, opts={}) { return await this.#mkdir(rel_path, opts); }

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
  async list(rel_path, opts={}) {
    const items = await this.readdir(rel_path, { withFileTypes: true, ...(opts.recursive ? { recursive: true } : {}) });
    const files = items.reduce((acc, item) => {
      const folder = item.parentPath.replace(this.smart_fs.fs_path, '').replace(/\\/g, '/').slice(1);
      const file = {
        basename: item.name.split('.')[0],
        extension: item.name.split('.').pop().toLowerCase(),
        name: item.name,
        path: folder ? folder + '/' + item.name : item.name,
      };
      if(this.smart_fs.is_excluded(file.path)) return acc;
      if(item.isFile()){
        if(opts.type === 'folder') return acc;
        file.type = 'file';
        // set to getter that calls statSync and formats the result
        Object.defineProperty(file, 'stat', {
          get: () => {
            const stat = this.statSync(file.path);
            return {
              ctime: stat.ctime.getTime(),
              mtime: stat.mtime.getTime(),
              size: stat.size,
            };
          }
        });
        acc[file.path] = file;
      }else if(item.isDirectory()){
        if(opts.type === 'file') return acc;
        file.type = 'folder';
        delete file.basename;
        delete file.extension;
        Object.defineProperty(file, 'children', {
          get: () => {
            return Object.values(this.smart_fs.files).filter(f => f.path.startsWith(file.path));
          }
        });
        acc[file.path] = file;
      }
      return acc;
    }, {});
    return Object.values(files);
  }
  async list_recursive(rel_path, opts={}) { return await this.list(rel_path, { ...opts, recursive: true }); }
  async list_files(rel_path, opts={}) { return (await this.list(rel_path, { ...opts, type: 'file' })); }
  async list_files_recursive(rel_path, opts={}) { return (await this.list_recursive(rel_path, { ...opts, type: 'file' })); }
  async list_folders(rel_path, opts={}) { return (await this.list(rel_path, { ...opts, type: 'folder' })); }
  async list_folders_recursive(rel_path, opts={}) { return (await this.list_recursive(rel_path, { ...opts, type: 'folder' })); }

  /**
   * Read the contents of a file
   * @param {string} rel_path - Relative path of the file to read
   * @returns {Promise<string>}
   */
  async read(rel_path, encoding) { return await this.readFile(rel_path, encoding); }

  /**
   * Remove a file
   * @param {string} rel_path - Relative path of the file to remove
   * @returns {Promise<void>}
   */
  async remove(rel_path) {
    try {
      await this.unlink(rel_path);
    } catch (error) {
      console.warn(`Error removing file: ${rel_path}`, error);
    }
  }

  /**
   * Remove a directory
   * @param {string} rel_path - Relative path of the directory to remove
   * @returns {Promise<void>}
   */
  async remove_dir(rel_path, recursive=false) { return await this.rmdir(rel_path, { recursive }); }

  /**
   * Rename a file or directory
   * @param {string} rel_path - Current relative path
   * @param {string} new_rel_path - New relative path
   * @returns {Promise<void>}
   */
  async rename(rel_path, new_rel_path) {
    // ensure parent folder exists
    const parent_folder = path.dirname(new_rel_path);
    if(!await this.exists(parent_folder)) await this.#mkdir(parent_folder, { recursive: true });
    return await this.#rename(rel_path, new_rel_path);
  }

  /**
   * Get file or directory stats
   * @param {string} rel_path - Relative path of the file or directory
   * @returns {Promise<fs.Stats>}
   */
  async stat(rel_path) { return await this.#stat(rel_path); }

  /**
   * Write content to a file
   * @param {string} rel_path - Relative path of the file to write
   * @param {string|Buffer} content - Content to write
   * @returns {Promise<void>}
   */
  async write(rel_path, content) {
    // ensure parent folder exists
    const parent_folder = path.dirname(rel_path);
    if(!await this.exists(parent_folder)) await this.mkdir(parent_folder, { recursive: true });
    return await this.writeFile(rel_path, content);
  }

  get sep() { return path.sep; }
}