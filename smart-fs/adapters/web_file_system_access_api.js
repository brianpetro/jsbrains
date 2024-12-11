/**
 * WebFileSystemAccessApiFsAdapter class
 *
 * This class leverages the modern File System Access API (available in some browsers)
 * to interact with the user's local filesystem. It requires user permission and
 * explicit file/directory selection. Operations are asynchronous and rely on handles
 * returned by the browser API.
 *
 * Note:
 * - This adapter does not automatically have access to arbitrary files.
 * - The user must grant access by selecting a directory and possibly re-grant access
 *   upon subsequent visits.
 * - The File System Access API is currently available in Chromium-based browsers and
 *   requires a secure context (HTTPS).
 *
 * Usage:
 * 1. Call `await adapter.request_root_directory()` to let the user pick a directory.
 * 2. Use the SmartFs API as usual:
 *    - await smart_fs.write('example.txt', 'Hello World');
 *    - const content = await smart_fs.read('example.txt');
 *    - await smart_fs.list('/');
 */
export class WebFileSystemAccessApiFsAdapter {
  /**
   * @param {Object} smart_fs - The SmartFs instance
   */
  constructor(smart_fs) {
    this.smart_fs = smart_fs;
    this.sep = '/';
    this.root_directory_handle = null;
  }

  /**
   * Prompt the user to select the root directory for operations.
   * @returns {Promise<void>}
   */
  async request_root_directory() {
    if (!window.showDirectoryPicker) {
      throw new Error('File System Access API not supported in this browser.');
    }
    this.root_directory_handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  }

  /**
   * Helper method to resolve a path in the virtual FS to a file/directory handle.
   * @param {string} rel_path
   * @param {Object} opts
   * @param {boolean} opts.create - Create if missing
   * @param {boolean} opts.dir - True if directory is desired
   * @returns {Promise<FileSystemFileHandle|FileSystemDirectoryHandle>}
   */
  async #get_handle(rel_path, { create = false, dir = false } = {}) {
    if (!this.root_directory_handle) {
      throw new Error('No root directory selected. Call request_root_directory() first.');
    }

    // Remove leading slashes
    rel_path = rel_path.replace(/^\/+/, '');
    if (!rel_path) {
      return this.root_directory_handle;
    }

    const parts = rel_path.split(this.sep).filter(Boolean);
    let current_handle = this.root_directory_handle;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const is_last = i === parts.length - 1;
      if (is_last && !dir) {
        // Expecting a file handle
        current_handle = await current_handle.getFileHandle(name, { create });
      } else {
        // Expecting a directory handle
        current_handle = await current_handle.getDirectoryHandle(name, { create });
      }
    }

    return current_handle;
  }

  /**
   * Get file metadata
   * @param {string} file_path
   */
  get_file(file_path) {
    const norm_path = file_path.replace(/^\/+/, '');
    const file = {};
    file.path = norm_path;
    // Extension and other metadata can be determined later if needed.
    // We don't have stat info until we actually read it.
    file.type = 'file'; 
    const parts = norm_path.split('/');
    file.name = parts.pop();
    const basenameParts = file.name.split('.');
    file.basename = basenameParts.shift();
    file.extension = basenameParts.pop() || '';
    Object.defineProperty(file, 'stat', {
      get: () => ({ ctime: 0, mtime: 0, size: 0 }) // Mock, as File System Access doesn't give this directly
    });
    return file;
  }

  async append(rel_path, content) {
    const file_handle = await this.#get_handle(rel_path, { create: true, dir: false });
    const writable = await file_handle.createWritable({ keepExistingData: true });
    await writable.write(content);
    await writable.close();
  }

  async mkdir(rel_path, opts = { recursive: true }) {
    // Just resolve a directory with create: true
    await this.#get_handle(rel_path, { create: true, dir: true });
  }

  async exists(rel_path) {
    try {
      await this.#get_handle(rel_path);
      return true;
    } catch (e) {
      return false;
    }
  }

  async list(rel_path = '', opts = {}) {
    const dir_handle = await this.#get_handle(rel_path, { create: false, dir: true });
    const items = [];
    for await (const entry of dir_handle.values()) {
      const item_path = rel_path ? rel_path + this.sep + entry.name : entry.name;
      const is_directory = entry.kind === 'directory';
      const file = {
        path: item_path,
        type: is_directory ? 'folder' : 'file'
      };
      if (!is_directory) {
        const parts = entry.name.split('.');
        file.name = entry.name;
        file.extension = parts.length > 1 ? parts.pop().toLowerCase() : '';
        file.basename = parts.join('.');
      } else {
        file.name = entry.name;
      }
      items.push(file);
    }

    if (opts.type === 'file') return items.filter(item => item.type === 'file');
    if (opts.type === 'folder') return items.filter(item => item.type === 'folder');
    return items;
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

  async list_files(rel_path, opts={}) {
    return await this.list(rel_path, { ...opts, type: 'file' });
  }

  async list_files_recursive(rel_path, opts={}) {
    const items = await this.list_recursive(rel_path);
    return items.filter(item => item.type === 'file');
  }

  async list_folders(rel_path, opts={}) {
    return await this.list(rel_path, { ...opts, type: 'folder' });
  }

  async list_folders_recursive(rel_path='', opts={}) {
    const items = await this.list_recursive(rel_path);
    return items.filter(item => item.type === 'folder');
  }

  async read(rel_path, encoding='utf-8') {
    const file_handle = await this.#get_handle(rel_path);
    const file = await file_handle.getFile();
    if (encoding === 'base64') {
      const arrayBuffer = await file.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } else {
      return await file.text();
    }
  }

  async remove(rel_path) {
    const parts = rel_path.split(this.sep);
    const name = parts.pop();
    const dir_path = parts.join(this.sep);
    const dir_handle = await this.#get_handle(dir_path, { dir: true });
    await dir_handle.removeEntry(name);
  }

  async remove_dir(rel_path, recursive=false) {
    const parts = rel_path.split(this.sep);
    const name = parts.pop();
    const dir_path = parts.join(this.sep);
    const parent_dir = await this.#get_handle(dir_path, { dir: true });
    await parent_dir.removeEntry(name, { recursive });
  }

  async rename(old_path, new_path) {
    // The File System Access API does not support renaming directly.
    // We'll have to read the old file, write a new file, and remove the old one.
    const content = await this.read(old_path);
    await this.write(new_path, content);
    await this.remove(old_path);
  }

  async stat(rel_path) {
    // Limited stat info: size and timestamps can be obtained by reading the file
    const file_handle = await this.#get_handle(rel_path);
    const file = await file_handle.getFile();
    return {
      isFile: () => true,
      isDirectory: () => false,
      size: file.size,
      mtime: file.lastModified ? new Date(file.lastModified) : new Date(),
      ctime: file.lastModified ? new Date(file.lastModified) : new Date()
    };
  }

  async write(rel_path, content) {
    const file_handle = await this.#get_handle(rel_path, { create: true, dir: false });
    const writable = await file_handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  get_link_target_path(link_target, source_path) {
    // No built-in fuzzy search here. Just a placeholder.
    return null;
  }
}