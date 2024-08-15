/**
 * TestFsSmartFsAdapter class
 * 
 * This class provides a mock file system adapter for testing purposes.
 * It simulates file system operations in memory, making it ideal for unit tests.
 * 
 * @class
 * @classdesc Mock file system adapter for SmartFs testing
 */
export class TestFsSmartFsAdapter {
  constructor(smart_fs) {
    this.smart_fs = smart_fs;
    this.files = {};
  }

  async append(rel_path, content) {
    this.files[rel_path] = (this.files[rel_path] || '') + content;
  }

  async mkdir(rel_path) {
    // For simplicity, we'll just mark directories with a special string
    this.files[rel_path] = '[DIRECTORY]';
  }

  async exists(rel_path) {
    return rel_path in this.files;
  }

  async list(rel_path) {
    // Return all keys that start with the given path
    return Object.keys(this.files).filter(key => key.startsWith(rel_path));
  }

  async read(rel_path) {
    if (!(rel_path in this.files)) {
      throw new Error(`File not found: ${rel_path}`);
    }
    return this.files[rel_path];
  }

  async remove(rel_path) {
    delete this.files[rel_path];
  }

  async remove_dir(rel_path) {
    // Remove all files and subdirectories
    Object.keys(this.files).forEach(key => {
      if (key.startsWith(rel_path)) {
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
    // Return a mock stat object
    return {
      isFile: () => this.files[rel_path] !== '[DIRECTORY]',
      isDirectory: () => this.files[rel_path] === '[DIRECTORY]',
      size: this.files[rel_path].length,
      mtime: new Date(),
    };
  }

  async write(rel_path, content) {
    this.files[rel_path] = content;
  }
}
