/**
 * TestSmartFsAdapter class
 * 
 * This class provides a mock file system adapter for testing purposes.
 * It simulates file system operations in memory, making it ideal for unit tests.
 * 
 * @class
 * @classdesc Mock file system adapter for SmartFs testing
 */
export class TestSmartFsAdapter {
  constructor(smart_fs) {
    this.smart_fs = smart_fs;
    this.files = {};
    this.sep = '/';
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
      } else if (!opts.recursive) {
        throw new Error(`Directory already exists: ${current_path}`);
      }
    }
  }

  async exists(rel_path) {
    return rel_path in this.files;
  }

  async list(rel_path, opts = {}) {
    const items = Object.keys(this.files)
      .filter(key => key.startsWith(rel_path) && key !== rel_path)
      .map(key => {
        const name = key.slice(rel_path.length + 1).split(this.sep)[0];
        const full_path = rel_path + this.sep + name;
        const is_file = this.files[full_path] !== '[DIRECTORY]';
        return {
          basename: name.split('.')[0],
          extension: is_file ? name.slice(name.lastIndexOf('.') + 1) : '',
          name: name,
          path: full_path,
          type: is_file ? 'file' : 'folder',
        };
      });

    if (opts.type === 'file') {
      return items.filter(item => item.type === 'file');
    } else if (opts.type === 'folder') {
      return items.filter(item => item.type === 'folder');
    }
    return items;
  }

  async list_recursive(rel_path, opts = {}) {
    return this.list(rel_path, { ...opts, recursive: true });
  }

  async list_files(rel_path, opts = {}) {
    return this.list(rel_path, { ...opts, type: 'file' });
  }

  async list_files_recursive(rel_path, opts = {}) {
    return this.list_recursive(rel_path, { ...opts, type: 'file' });
  }

  async list_folders(rel_path, opts = {}) {
    return this.list(rel_path, { ...opts, type: 'folder' });
  }

  async list_folders_recursive(rel_path = '', opts = {}) {
    const all_paths = Object.keys(this.files)
      .filter(key => key.startsWith(rel_path) && this.files[key] === '[DIRECTORY]' && key !== rel_path)
      .map(key => ({
        basename: key.split(this.sep).pop(),
        name: key.split(this.sep).pop(),
        path: key,
        type: 'folder'
      }));

    return all_paths;
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

  async remove_dir(rel_path) {
    Object.keys(this.files).forEach(key => {
      if (key === rel_path || key.startsWith(rel_path + this.sep)) {
        delete this.files[key];
      }
    });
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

  async write(rel_path, content) {
    const dir_path = rel_path.split(this.sep).slice(0, -1).join(this.sep);
    if (dir_path) {
      await this.mkdir(dir_path, { recursive: true });
    }
    this.files[rel_path] = content;
  }

  get_link_target_path(link_target, source_path) {
    // Simple implementation for testing purposes
    return Object.keys(this.files).find(path => path.endsWith(link_target));
  }
}