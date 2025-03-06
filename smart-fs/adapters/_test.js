/**
 * SmartFsTestAdapter class
 * 
 * This class provides a mock file system adapter for testing purposes.
 * It simulates file system operations in memory, making it ideal for unit tests.
 * 
 * @class
 * @classdesc Mock file system adapter for SmartFs testing
 */
import path from 'path';
export class SmartFsTestAdapter {
  constructor(smart_fs) {
    this.smart_fs = smart_fs;
    this.files = {};
    this.sep = '/';
  }

  get_file(file_path) {
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

  async append(rel_path, content) {
    this.files[rel_path] = (this.files[rel_path] || '') + content;
  }

  async mkdir(rel_path, opts = { recursive: true }) {
    const parts = rel_path.split(this.sep);
    let current_path = '';
    for (const part of parts) {
      current_path += (current_path ? this.sep : '') + part;
      if (!(current_path in this.files) || opts.recursive) {
        this.files[current_path] = '[DIRECTORY]';
        this.smart_fs.folders[current_path] = true;
      } else if (!opts.recursive) {
        throw new Error(`Directory already exists: ${current_path}`);
      }
    }
  }

  async exists(rel_path) {
    return rel_path in this.files;
  }

  
  async list(rel_path = '', opts = {}) {
    if(rel_path === '/') rel_path = '';
    const items = {};
    for (const key of Object.keys(this.files)) {
      if (key === rel_path) continue;
      if (rel_path && !key.startsWith(rel_path)) continue;
  
      // Remove the rel_path from key and remove any leading slashes
      let remaining_path = key.slice(rel_path.length);
      if (remaining_path.startsWith(this.sep)) remaining_path = remaining_path.slice(1);
  
      const parts = remaining_path.split(this.sep);
      const name = parts[0];
      const full_path = rel_path ? path.join(rel_path, name) : name;
  
      // Skip if already added
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
              .filter(k => k.startsWith(full_path) && k !== full_path)
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
  
  async list_recursive(rel_path = '', opts = {}) {
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


  async list_files(rel_path, opts = {}) {
    return await this.list(rel_path, { ...opts, type: 'file' });
  }

  async list_files_recursive(rel_path, opts = {}) {
    return await this.list_recursive(rel_path, { ...opts, type: 'file' });
  }

  async list_folders(rel_path, opts = {}) {
    return await this.list(rel_path, { ...opts, type: 'folder' });
  }

  async list_folders_recursive(rel_path = '', opts = {}) {
    return await this.list_recursive(rel_path, { ...opts, type: 'folder' });
  }

  async read(rel_path, encoding = 'utf-8') {
    if (!(rel_path in this.files)) {
      throw new Error(`File not found: ${rel_path}`);
    }
    if (encoding === 'base64') {
      return Buffer.from(this.files[rel_path]).toString('base64');
    }
    return this.files[rel_path];
  }

  async remove(rel_path) {
    delete this.files[rel_path];
  }

  async remove_dir(rel_path, recursive = false) {
    if (recursive) {
      Object.keys(this.files).forEach(key => {
        if (key === rel_path || key.startsWith(rel_path + this.sep)) {
          delete this.files[key];
        }
      });
    } else {
      if (Object.keys(this.files).some(key => key.startsWith(rel_path + this.sep))) {
        throw new Error(`Directory not empty: ${rel_path}`);
      }
      delete this.files[rel_path];
    }
  }

  async rename(rel_path, new_rel_path) {
    if (!(rel_path in this.files)) {
      throw new Error(`File not found: ${rel_path}`);
    }
    this.files[new_rel_path] = this.files[rel_path];
    delete this.files[rel_path];
  }

  async stat(rel_path) {
    if (!(rel_path in this.files)) {
      console.log("stat", rel_path, this.files);
      throw new Error(`File not found: ${rel_path}`);
    }
    const is_directory = this.files[rel_path] === '[DIRECTORY]';
    return {
      isFile: () => !is_directory,
      isDirectory: () => is_directory,
      size: is_directory ? 0 : this.files[rel_path].length,
      mtime: new Date(),
      ctime: new Date(),
    };
  }

  statSync(rel_path) {
    return {
      ctime: new Date(),
      mtime: new Date(),
      size: this.files[rel_path].length,
    };
  }

  async write(rel_path, content) {
    const dir_path = rel_path.split(this.sep).slice(0, -1).join(this.sep);
    if (dir_path) {
      await this.mkdir(dir_path, { recursive: true });
    }
    this.files[rel_path] = content;
    this.smart_fs.files[rel_path] = {
      path: rel_path,
      extension: rel_path.split('.').pop().toLowerCase(),
      name: rel_path.split('/').pop(),
      basename: rel_path.split('/').pop().split('.').shift(),
      type: 'file',
    };
  }

  get_link_target_path(link_target, source_path) {
    // Simple implementation for testing purposes
    return Object.keys(this.files).find(path => path.includes(link_target));
  }

  get_base_path() {
    return this.smart_fs.fs_path;
  }
}