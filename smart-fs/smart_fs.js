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
import { Minimatch } from 'minimatch';

const fsPromises = fs.promises;

class SmartFs {
  constructor(env, opts = {}) {
    this.env_path = opts.env_path || env.config.env_path || env.config.vault_path; // vault_path is DEPRECATED
    this.gitignore_patterns = this.#load_gitignore();
  }

  #load_gitignore() {
    const patterns = [];
    const gitignore_path = path.join(this.env_path, '.gitignore');
    if (fs.existsSync(gitignore_path)) {
      fs.readFileSync(gitignore_path, 'utf8')
        .split('\n')
        .filter(Boolean)
        .forEach(pattern => patterns.push(new Minimatch(pattern.trim())))
      ;
    }
    patterns.push(new Minimatch('.env'));
    patterns.push(new Minimatch('.git'));
    patterns.push(new Minimatch('.gitignore'));
    return patterns;
  }
  add_ignore_pattern(pattern) {
    this.gitignore_patterns.push(new Minimatch(pattern.trim()));
  }

  is_ignored(_path) {
    if (!this.gitignore_patterns.length) return false;
    const relative_path = _path.startsWith(this.env_path) ? path.relative(this.env_path, _path) : _path;
    return this.gitignore_patterns.some(pattern => pattern.match(relative_path));
  }
  #resolvePath(rel_path) {
    if (rel_path.startsWith(this.env_path)) return rel_path;
    // console.log({ rel_path, env_path: this.env_path });
    return path.join(this.env_path, rel_path);
  }

  pre_process(resolved_path, ...args) {
    if (this.is_ignored(resolved_path)) return null;
    return [resolved_path, ...args];
  }

  post_process(returned_value) {
    if (Array.isArray(returned_value) && typeof returned_value[0] === 'string') {
      returned_value = returned_value.filter(r => !this.is_ignored(r));
    }
    return returned_value;
  }
  #processPaths(paths) {
    return paths.map(path => {
      const resolvedPath = this.#resolvePath(path);
      // console.log(resolvedPath);
      if (this.is_ignored(resolvedPath)){
        // console.log(`Path is ignored: ${path}`);
        return { error: `Path is ignored: ${path}` };
      }
      return resolvedPath;
    });
  }

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
