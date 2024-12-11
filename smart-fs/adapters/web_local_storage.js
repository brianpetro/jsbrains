/**
 * WebLocalStorageFsAdapter class
 * 
 * This class provides a browser-based adapter for SmartFs.
 * It simulates file system operations using localStorage as a backend.
 * All file and folder structures are stored as a JSON map in localStorage.
 * 
 * @class
 * @classdesc Web-based file system adapter for SmartFs using localStorage.
 */

export class WebLocalStorageFsAdapter {
  /**
   * Create a SmartFsWebAdapter instance
   * @param {Object} smart_fs - The SmartFs instance
   */
  constructor(smart_fs) {
    this.smart_fs = smart_fs;
    this.sep = '/';
    this.storage_key = 'smart_fs_web_storage';
    // Attempt to load existing file structure from localStorage or init new
    const stored_data = localStorage.getItem(this.storage_key);
    if (stored_data) {
      this.files = JSON.parse(stored_data);
    } else {
      this.files = {};
      this.#save();
    }
  }

  /**
   * Save the current file structure to localStorage
   * @private
   */
  #save() {
    localStorage.setItem(this.storage_key, JSON.stringify(this.files));
  }

  /**
   * Normalize a file path by removing leading slashes.
   * @private
   * @param {string} file_path 
   * @returns {string}
   */
  #normalize_path(file_path) {
    return file_path.replace(/^\/+/, '');
  }

  /**
   * Get metadata for a file
   * @param {string} file_path 
   * @returns {Object}
   */
  get_file(file_path) {
    const norm_path = this.#normalize_path(file_path);
    const file = {};
    file.path = norm_path;
    file.type = this.files[norm_path] === '[DIRECTORY]' ? 'folder' : 'file';
    file.extension = file.type === 'file' ? file.path.split('.').pop().toLowerCase() : undefined;
    file.name = file.path.split('/').pop();
    file.basename = (file.type === 'file') ? file.name.split('.').shift() : undefined;
    Object.defineProperty(file, 'stat', {
      get: () => {
        const stat = this.#stat_sync(norm_path);
        return {
          ctime: stat.ctime.getTime(),
          mtime: stat.mtime.getTime(),
          size: stat.size
        };
      }
    });
    return file;
  }

  /**
   * Append content to a file
   * @param {string} rel_path 
   * @param {string} content 
   */
  async append(rel_path, content) {
    const norm_path = this.#normalize_path(rel_path);
    this.files[norm_path] = (this.files[norm_path] || '') + content;
    this.#save();
  }

  /**
   * Create a directory
   * @param {string} rel_path 
   * @param {Object} opts 
   */
  async mkdir(rel_path, opts={ recursive: true }) {
    const norm_path = this.#normalize_path(rel_path);
    const parts = norm_path.split(this.sep).filter(Boolean);
    let current_path = '';
    for (const part of parts) {
      current_path += (current_path ? this.sep : '') + part;
      if (!this.files[current_path] || opts.recursive) {
        this.files[current_path] = '[DIRECTORY]';
      } else if (!opts.recursive) {
        throw new Error(`Directory already exists: ${current_path}`);
      }
    }
    this.#save();
  }

  /**
   * Check if file or directory exists
   * @param {string} rel_path 
   * @returns {boolean}
   */
  async exists(rel_path) {
    const norm_path = this.#normalize_path(rel_path);
    return norm_path in this.files;
  }

  /**
   * List contents of a directory
   * @param {string} rel_path 
   * @param {Object} opts 
   * @returns {Array} Array of file/folder objects
   */
  async list(rel_path='', opts={}) {
    let norm_path = this.#normalize_path(rel_path);
    if(norm_path === '/') norm_path = '';
    const items = {};
    for (const key of Object.keys(this.files)) {
      if (key === norm_path) continue;
      if (norm_path && !key.startsWith(norm_path + this.sep)) continue;

      let remaining_path = norm_path ? key.slice(norm_path.length) : key;
      if (remaining_path.startsWith(this.sep)) remaining_path = remaining_path.slice(1);

      const parts = remaining_path.split(this.sep);
      const name = parts[0];
      const full_path = norm_path ? norm_path + this.sep + name : name;

      if (items[full_path]) continue;

      const is_file = this.files[full_path] !== '[DIRECTORY]';
      const file = this.get_file(full_path);
      file.type = is_file ? 'file' : 'folder';
      if (!is_file) {
        delete file.basename;
        delete file.extension;
        Object.defineProperty(file, 'children', {
          get: () => {
            return Object.keys(this.files)
              .filter(k => k.startsWith(full_path + this.sep))
              .map(k => this.get_file(k));
          }
        });
      }
      items[full_path] = file;
    }

    let result = Object.values(items);

    if (opts.type === 'file') {
      return result.filter(item => item.type === 'file');
    } else if (opts.type === 'folder') {
      return result.filter(item => item.type === 'folder');
    }
    return result;
  }

  /**
   * Recursively list contents of a directory
   * @param {string} rel_path 
   * @param {Object} opts 
   * @returns {Array} Array of file/folder objects
   */
  async list_recursive(rel_path='', opts={}) {
    const all_items = [];
    const process_items = async (current_path) => {
      const items = await this.list(current_path);
      for (const item of items) {
        all_items.push(item);
        if (item.type === 'folder') {
          await process_items(item.path);
        }
      }
    };
    await process_items(rel_path);
    return all_items;
  }

  /**
   * List files in a directory
   * @param {string} rel_path 
   * @param {Object} opts 
   * @returns {Array}
   */
  async list_files(rel_path, opts={}) {
    return await this.list(rel_path, { ...opts, type: 'file' });
  }

  /**
   * Recursively list files
   * @param {string} rel_path 
   * @param {Object} opts 
   * @returns {Array}
   */
  async list_files_recursive(rel_path, opts={}) {
    const items = await this.list_recursive(rel_path);
    return items.filter(item => item.type === 'file');
  }

  /**
   * List folders in a directory
   * @param {string} rel_path 
   * @param {Object} opts 
   * @returns {Array}
   */
  async list_folders(rel_path, opts={}) {
    return await this.list(rel_path, { ...opts, type: 'folder' });
  }

  /**
   * Recursively list folders
   * @param {string} rel_path 
   * @param {Object} opts 
   * @returns {Array}
   */
  async list_folders_recursive(rel_path='', opts={}) {
    const items = await this.list_recursive(rel_path);
    return items.filter(item => item.type === 'folder');
  }

  /**
   * Read file contents
   * @param {string} rel_path 
   * @param {string} encoding 
   * @returns {string|null}
   */
  async read(rel_path, encoding='utf-8') {
    const norm_path = this.#normalize_path(rel_path);
    if (!(norm_path in this.files)) {
      throw new Error(`File not found: ${norm_path}`);
    }
    const content = this.files[norm_path];
    if (encoding === 'base64') {
      return btoa(content);
    }
    return content;
  }

  /**
   * Remove a file
   * @param {string} rel_path 
   */
  async remove(rel_path) {
    const norm_path = this.#normalize_path(rel_path);
    delete this.files[norm_path];
    this.#save();
  }

  /**
   * Remove a directory
   * @param {string} rel_path 
   * @param {boolean} recursive 
   */
  async remove_dir(rel_path, recursive=false) {
    const norm_path = this.#normalize_path(rel_path);
    if (recursive) {
      Object.keys(this.files).forEach(key => {
        if (key === norm_path || key.startsWith(norm_path + this.sep)) {
          delete this.files[key];
        }
      });
    } else {
      if (Object.keys(this.files).some(key => key.startsWith(norm_path + this.sep))) {
        throw new Error(`Directory not empty: ${norm_path}`);
      }
      delete this.files[norm_path];
    }
    this.#save();
  }

  /**
   * Rename a file or directory
   * @param {string} rel_path 
   * @param {string} new_rel_path 
   */
  async rename(rel_path, new_rel_path) {
    const old_norm = this.#normalize_path(rel_path);
    const new_norm = this.#normalize_path(new_rel_path);
    if (!(old_norm in this.files)) {
      throw new Error(`File not found: ${old_norm}`);
    }
    const content = this.files[old_norm];
    delete this.files[old_norm];

    // Ensure parent directories exist
    const parent_folder = new_norm.split(this.sep).slice(0, -1).join(this.sep);
    if (parent_folder && !(parent_folder in this.files)) {
      await this.mkdir(parent_folder, { recursive: true });
    }

    this.files[new_norm] = content;
    this.#save();
  }

  /**
   * Get file or directory stats
   * @param {string} rel_path 
   * @returns {Object}
   */
  async stat(rel_path) {
    const norm_path = this.#normalize_path(rel_path);
    if (!(norm_path in this.files)) {
      throw new Error(`File not found: ${norm_path}`);
    }
    return this.#stat_sync(norm_path);
  }

  /**
   * Synchronous stat helper
   * @private
   * @param {string} norm_path 
   * @returns {Object}
   */
  #stat_sync(norm_path) {
    const is_directory = this.files[norm_path] === '[DIRECTORY]';
    return {
      isFile: () => !is_directory,
      isDirectory: () => is_directory,
      size: is_directory ? 0 : this.files[norm_path].length,
      mtime: new Date(),
      ctime: new Date()
    };
  }

  /**
   * Write content to a file
   * @param {string} rel_path 
   * @param {string|Buffer} content 
   */
  async write(rel_path, content) {
    const norm_path = this.#normalize_path(rel_path);
    const dir_path = norm_path.split(this.sep).slice(0, -1).join(this.sep);
    if (dir_path && !(dir_path in this.files)) {
      await this.mkdir(dir_path, { recursive: true });
    }
    this.files[norm_path] = content;
    this.#save();
  }

  /**
   * Perform fuzzy link target path search (stubbed)
   * @param {string} link_target 
   * @param {string} source_path 
   * @returns {string|undefined} 
   */
  get_link_target_path(link_target, source_path) {
    // Simple implementation for demonstration
    return Object.keys(this.files).find(path => path.endsWith(link_target));
  }
}
