// Copyright (c) Brian Joseph Petro

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import {minimatch} from 'minimatch';

/**
 * SmartFs - Intelligent file system wrapper for Smart Environments
 * 
 * @class
 * @description
 * SmartFs provides a powerful abstraction layer over file system operations,
 * designed to work seamlessly with Smart Environments. It enhances standard
 * file system functionality with intelligent features and robust error handling.
 * 
 * Key Features:
 * - Automatic `.gitignore` pattern handling for secure file operations
 * - Smart path resolution relative to the environment path
 * - Adapter-based architecture for flexible backend support (e.g., Node.js fs, Obsidian, etc.)
 * - Pre-processing and post-processing hooks for advanced file handling
 * - Comprehensive error handling and logging
 * - Support for both synchronous and asynchronous operations
 * 
 * @example
 * const env = new SmartEnvironment();
 * const smart_fs = new SmartFs(env, { adapter: NodeFsAdapter });
 * 
 * // Use smart_fs methods for enhanced file operations
 * try {
 *   const file_content = await smart_fs.read('example.txt');
 *   console.log(file_content);
 * } catch (error) {
 *   console.error('Error reading file:', error.message);
 * }
 * 
 * // Perform directory operations
 * await smart_fs.mkdir('new_folder');
 * const files = await smart_fs.list('.');
 * console.log('Files in current directory:', files);
 * 
 * // Write to a file with automatic exclusion handling
 * await smart_fs.write('output.txt', 'Hello, SmartFs!');
 * 
 * @see {@link https://github.com/brianpetro/js-brains} for more information and updates.
 */
class SmartFs {
  /**
   * Create a new SmartFs instance
   * 
   * @param {Object} env - The Smart Environment instance
   * @param {Object} [opts={}] - Optional configuration
   * @param {string} [opts.env_path] - Custom environment path
   */
  constructor(env, opts = {}) {
    this.env = env;
    this.env_path = opts.env_path || env.config.env_path || env.config.vault_path || ''; // vault_path is DEPRECATED
    if(!opts.adapter) throw new Error('SmartFs requires an adapter');
    this.adapter = new opts.adapter(this);
    this.excluded_patterns = [];
    if(Array.isArray(opts.exclude_patterns)) {
      opts.exclude_patterns.forEach(pattern => this.add_ignore_pattern(pattern));
    }
    this.smart_env_data_folder = opts.smart_env_data_folder || 'smart-env';
  }
  static async create(env, opts = {}) {
    if(typeof opts.env_path !== 'string' || opts.env_path.length === 0) return; // no env_path provided
    if(typeof env.smart_fs !== 'object') env.smart_fs = {};
    if(env.smart_fs[opts.env_path] instanceof this) return env.smart_fs[opts.env_path];
    env.smart_fs[opts.env_path] = new this(env, opts);
    await env.smart_fs[opts.env_path].init();
    return env.smart_fs[opts.env_path];
  }
  async init() {
    await this.load_gitignore();
  }

  /**
   * Load .gitignore patterns
   * 
   * @returns {Promise<minimatch[]>} Array of Minimatch patterns
   */
  async load_gitignore() {
    const gitignore_path = '.gitignore';
    const gitignore_exists = await this.exists(gitignore_path);
    if (gitignore_exists) {
      const gitignore_content = await this.read(gitignore_path);
      gitignore_content
        .split('\n')
        .filter(line => !line.startsWith('#')) // ignore comments
        .filter(Boolean)
        .forEach(pattern => this.add_ignore_pattern(pattern))
      ;
    }
    this.add_ignore_pattern('**/*.excalidraw.md');
    // exclude all hidden files and folders
    this.add_ignore_pattern('**/.**', { dot: true }); // ignore hidden files and folders in subdirectories
    this.add_ignore_pattern('**/.*/**'); // ignore hidden directories and their contents
  }

  /**
   * Add a new ignore pattern
   * 
   * @param {string} pattern - The pattern to add
   */
  add_ignore_pattern(pattern, opts = {}) {
    this.excluded_patterns.push(new minimatch.Minimatch(pattern.trim(), opts));
  }
  /**
   * Check if a path is ignored based on gitignore patterns
   * 
   * @param {string} _path - The path to check
   * @returns {boolean} True if the path is ignored, false otherwise
   */
  is_excluded(_path) {
    if (!this.excluded_patterns.length) return false;
    return this.excluded_patterns.some(pattern => pattern.match(_path));
  }

  /**
   * Check if any path in an array of paths is excluded
   * 
   * @param {string[]} paths - Array of paths to check
   * @returns {boolean} True if any path is excluded, false otherwise
   */
  has_excluded_patterns(paths) {
    return paths.some(p => this.is_excluded(p));
  }

  /**
   * Pre-process an array of paths, throwing an error if any path is excluded
   * 
   * @param {string[]} paths - Array of paths to pre-process
   * @throws {Error} If any path in the array is excluded
   * @returns {string[]} The array of paths
   */
  pre_process(paths) {
    if (this.has_excluded_patterns(paths)) {
      throw new Error(`Path is excluded: ${paths.find(p => this.is_excluded(p))}`);
    }
    return paths;
  }

  /**
   * Post-process the result of an operation
   * 
   * @param {any} returned_value - The value returned by the operation
   * @returns {any} The post-processed value
   */
  post_process(returned_value) {
    if(this.adapter.post_process) return this.adapter.post_process(returned_value);
    if (Array.isArray(returned_value)){
      returned_value = returned_value.filter(r => {
        if(typeof r === 'string') return !this.is_excluded(r);
        if(typeof r === 'object' && r.path) return !this.is_excluded(r.path);
        return true;
      });
    }
    return returned_value;
  }
  // v2
  async use_adapter(method, paths, ...args) {
    if(!this.adapter[method]) throw new Error(`Method ${method} not found in adapter`);
    paths = this.pre_process(paths);
    let resp = await this.adapter[method](...paths, ...args);
    return this.post_process(resp);
  }

  /**
   * Append content to a file
   * 
   * @param {string} rel_path - The relative path of the file to append to
   * @param {string|Buffer} content - The content to append
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async append(rel_path, content) { return await this.use_adapter('append', [rel_path], content); }

  /**
   * Create a new directory
   * 
   * @param {string} rel_path - The relative path of the directory to create
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async mkdir(rel_path) { return await this.use_adapter('mkdir', [rel_path]); }

  /**
   * Check if a file or directory exists
   * 
   * @param {string} rel_path - The relative path to check
   * @returns {Promise<boolean>} True if the path exists, false otherwise
   */
  async exists(rel_path) { return await this.use_adapter('exists', [rel_path]); }

  /**
   * List files in a directory
   * 
   * @param {string} rel_path - The relative path to list
   * @returns {Promise<string[]>} Array of file paths
   */
  async list(rel_path='/') { return await this.use_adapter('list', [rel_path]); }
  async list_recursive(rel_path='/') { return await this.use_adapter('list_recursive', [rel_path]); }
  async list_files(rel_path='/') { return await this.use_adapter('list_files', [rel_path]); }
  async list_files_recursive(rel_path='/') { return await this.use_adapter('list_files_recursive', [rel_path]); }
  async list_folders(rel_path='/') { return await this.use_adapter('list_folders', [rel_path]); }
  async list_folders_recursive(rel_path='/') { return await this.use_adapter('list_folders_recursive', [rel_path]); }

  /**
   * Read the contents of a file
   * 
   * @param {string} rel_path - The relative path of the file to read
   * @returns {Promise<string|Buffer>} The contents of the file
   */
  async read(rel_path) { return await this.use_adapter('read', [rel_path]); }

  /**
   * Remove a file
   * 
   * @param {string} rel_path - The relative path of the file to remove
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async remove(rel_path) { return await this.use_adapter('remove', [rel_path]); }

  /**
   * Remove a directory
   * 
   * @param {string} rel_path - The relative path of the directory to remove
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async remove_dir(rel_path) { return await this.use_adapter('remove_dir', [rel_path]); }

  /**
   * Rename a file or directory
   * 
   * @param {string} rel_path - The current relative path
   * @param {string} new_rel_path - The new relative path
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async rename(rel_path, new_rel_path) { return await this.use_adapter('rename', [rel_path, new_rel_path]); }

  /**
   * Get file or directory statistics
   * 
   * @param {string} rel_path - The relative path to get statistics for
   * @returns {Promise<Object>} An object containing file or directory statistics
   */
  async stat(rel_path) { return await this.use_adapter('stat', [rel_path]); }

  /**
   * Write content to a file
   * 
   * @param {string} rel_path - The relative path of the file to write to
   * @param {string|Buffer} content - The content to write
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async write(rel_path, content) { return await this.use_adapter('write', [rel_path], content); }
  // // aliases
  // async create(rel_path, content) { return await this.use_adapter('write', [rel_path], content); }
  // async update(rel_path, content) { return await this.use_adapter('write', [rel_path], content); }

  // handle smart_env_data folder (excluded by default from base methods)
  // wrapped with ensure_smart_env_data_path to ensure relative to smart_env_data_folder
  get smart_env_data(){
    return {
      append: async (rel_path, content) => await this.adapter.append(this.ensure_smart_env_data_path(rel_path), content),
      exists: async (rel_path) => await this.adapter.exists(this.ensure_smart_env_data_path(rel_path)),
      list: async (rel_path) => await this.adapter.list(this.ensure_smart_env_data_path(rel_path)),
      mkdir: async (rel_path) => await this.adapter.mkdir(this.ensure_smart_env_data_path(rel_path)),
      read: async (rel_path) => await this.adapter.read(this.ensure_smart_env_data_path(rel_path)),
      remove_dir: async (rel_path) => await this.adapter.remove_dir(this.ensure_smart_env_data_path(rel_path)),
      remove: async (rel_path) => await this.adapter.remove(this.ensure_smart_env_data_path(rel_path)),
      write: async (rel_path, content) => await this.adapter.write(this.ensure_smart_env_data_path(rel_path), content),
    }
  }
  ensure_smart_env_data_path(rel_path) {
    if (!rel_path.startsWith(this.smart_env_data_folder)) {
      rel_path = this.smart_env_data_folder + '/' + rel_path;
    }
    return rel_path.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
  }
}

export { SmartFs };
