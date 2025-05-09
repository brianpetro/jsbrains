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

import fs from 'fs';
import path from 'path';
import Minimatch from 'minimatch';

const fsPromises = fs.promises;

/**
 * SmartFs - Intelligent file system wrapper for Smart Environments
 * 
 * @class
 * @description
 * SmartFs provides a layer of abstraction over Node.js's native `fs` module,
 * adding features like automatic `.gitignore` handling and path resolution.
 * It's designed to work seamlessly with Smart Environments, enhancing file
 * system operations with additional smart functionality.
 * 
 * Key Features:
 * - Automatic `.gitignore` pattern handling
 * - Path resolution relative to the environment path
 * - Wrapping of common `fs` methods with additional smart functionality
 * - Support for both synchronous and asynchronous operations
 * 
 * @example
 * const env = new SmartEnvironment();
 * const smartFs = new SmartFs(env);
 * 
 * // Use smartFs methods instead of native fs methods
 * await smartFs.readFile('example.txt');
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
    this.env_path = opts.env_path || env.config.env_path || env.config.vault_path || ''; // vault_path is DEPRECATED
    this.gitignore_patterns = [];
    this.#load_exclusions();
  }
  static async create(env, opts = {}) {
    if(typeof opts.env_path !== 'string' || opts.env_path.length === 0) return; // no env_path provided
    if(typeof env.smart_fs !== 'object') env.smart_fs = {};
    if(env.smart_fs[opts.env_path] instanceof this) return env.smart_fs[opts.env_path];
    env.smart_fs[opts.env_path] = new this(env, opts);
    await env.smart_fs[opts.env_path].init();
    return env.smart_fs[opts.env_path];
  }
  async init() {}

  /**
   * Load .gitignore patterns
   * 
   * @private
   * @returns {Minimatch[]} Array of Minimatch patterns
   */
  #load_exclusions() {
    const gitignore_path = path.join(this.env_path, '.gitignore');
    if (fs.existsSync(gitignore_path)) {
      fs.readFileSync(gitignore_path, 'utf8')
        .split('\n')
        .filter(line => !line.startsWith('#')) // ignore comments
        .filter(Boolean)
        .forEach(pattern => this.add_ignore_pattern(pattern))
      ;
    }
    this.add_ignore_pattern('.env');
    this.add_ignore_pattern('.git');
    this.add_ignore_pattern('.gitignore');
  }

  /**
   * Add a new ignore pattern
   * 
   * @param {string} pattern - The pattern to add
   */
  add_ignore_pattern(pattern, opts = {}) {
    this.gitignore_patterns.push(new Minimatch.Minimatch(pattern.trim(), opts));
  }

  /**
   * Check if a path is ignored
   * 
   * @param {string} _path - The path to check
   * @returns {boolean} True if the path is ignored, false otherwise
   */
  is_ignored(_path) {
    if (!this.gitignore_patterns.length) return false;
    const relative_path = _path.startsWith(this.env_path) ? path.relative(this.env_path, _path) : _path;
    return this.gitignore_patterns.some(pattern => pattern.match(relative_path));
  }

  /**
   * Resolve a relative path to an absolute path
   * 
   * @private
   * @param {string} rel_path - The relative path to resolve
   * @returns {string} The resolved absolute path
   */
  #resolvePath(rel_path) {
    if (rel_path.startsWith(this.env_path)) return rel_path;
    return path.join(this.env_path, rel_path);
  }

  /**
   * Pre-process a path before operation
   * 
   * @param {string} resolved_path - The resolved path
   * @param {...any} args - Additional arguments
   * @returns {Array|null} Processed arguments or null if path is ignored
   */
  pre_process(resolved_path, ...args) {
    if (this.is_ignored(resolved_path)) return null;
    return [resolved_path, ...args];
  }

  /**
   * Post-process the result of an operation
   * 
   * @param {any} returned_value - The value returned by the operation
   * @returns {any} The post-processed value
   */
  post_process(returned_value) {
    if (Array.isArray(returned_value) && typeof returned_value[0] === 'string') {
      returned_value = returned_value.filter(r => !this.is_ignored(r));
    }
    return returned_value;
  }

  /**
   * Process paths before an operation
   * 
   * @private
   * @param {string[]} paths - The paths to process
   * @returns {string[]|Object[]} Processed paths or error objects
   */
  #processPaths(paths) {
    return paths.map(path => {
      const resolvedPath = this.#resolvePath(path);
      if (this.is_ignored(resolvedPath)){
        return { error: `Path is ignored: ${path}` };
      }
      return resolvedPath;
    });
  }

  /**
   * Wrap an asynchronous fs method
   * 
   * @private
   * @param {Function} method - The method to wrap
   * @param {number} [path_count=1] - The number of path arguments
   * @returns {Function} The wrapped method
   */
  #wrapMethod(method, path_count = 1) {
    return async (...args) => {
      const paths = args.slice(0, path_count);
      const other_args = args.slice(path_count);
      const processed_paths = this.#processPaths(paths);
      if (processed_paths.some(p => p.error)) return processed_paths.find(p => p.error);

      let result = await method(...processed_paths, ...other_args);
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
  #wrapSyncMethod(method, path_count = 1) {
    return (...args) => {
      const paths = args.slice(0, path_count);
      const other_args = args.slice(path_count);
      const processed_paths = this.#processPaths(paths);
      if (processed_paths.some(p => p.error)) return processed_paths.find(p => p.error);

      let result = method(...processed_paths, ...other_args);
      return this.post_process(result);
    };
  }

  // Wrapped fs methods
  appendFile = this.#wrapMethod(fsPromises.appendFile);
  appendFileSync = this.#wrapSyncMethod(fs.appendFileSync);
  // exists = this.#wrapMethod(fsPromises.access); // better handled by custom exists method
  existsSync = this.#wrapSyncMethod(fs.existsSync);
  mkdir = this.#wrapMethod(fsPromises.mkdir);
  mkdirSync = this.#wrapSyncMethod(fs.mkdirSync);
  readdir = this.#wrapMethod(fsPromises.readdir);
  readdirSync = this.#wrapSyncMethod(fs.readdirSync);
  readFile = this.#wrapMethod(fsPromises.readFile);
  readFileSync = this.#wrapSyncMethod(fs.readFileSync);
  realpath = this.#wrapMethod(fsPromises.realpath);
  realpathSync = this.#wrapSyncMethod(fs.realpathSync);
  rename = this.#wrapMethod(fsPromises.rename);
  renameSync = this.#wrapSyncMethod(fs.renameSync);
  // rmdir = this.#wrapMethod(fsPromises.rmdir); // DEPRECATED
  // rmdirSync = this.#wrapSyncMethod(fs.rmdirSync); // DEPRECATED
  rmdir = this.#wrapMethod(fsPromises.rm);
  rmdirSync = this.#wrapSyncMethod(fs.rmSync);
  stat = this.#wrapMethod(fsPromises.stat);
  statSync = this.#wrapSyncMethod(fs.statSync);
  symlink = this.#wrapMethod(fsPromises.symlink, 2);
  symlinkSync = this.#wrapSyncMethod(fs.symlinkSync, 2);
  unlink = this.#wrapMethod(fsPromises.unlink);
  unlinkSync = this.#wrapSyncMethod(fs.unlinkSync);
  writeFile = this.#wrapMethod(fsPromises.writeFile);
  writeFileSync = this.#wrapSyncMethod(fs.writeFileSync);

  /**
   * Check if a file or directory exists
   * 
   * @param {string} rel_path - The relative path to check
   * @returns {Promise<boolean>} True if the path exists, false otherwise
   */
  async exists(rel_path) {
    try {
      await fsPromises.access(this.#resolvePath(rel_path));
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error; // Re-throw the error if it's not a 'file not found' error
    }
  }
}

export { SmartFs };
