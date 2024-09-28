/**
 * SmartFsObsidianAdapter class
 * 
 * This class provides an adapter for the Obsidian vault adapter to work with SmartFs.
 * It wraps Obsidian vault adapter methods for file system operations.
 * 
 * @class
 * @classdesc Adapter for Obsidian vault file system operations compatible with SmartFs
 */
export class SmartFsObsidianAdapter {
  /**
   * Create an SmartFsObsidianAdapter instance
   * 
   * @param {Object} smart_fs - The SmartFs instance
   */
  constructor(smart_fs) {
    this.smart_fs = smart_fs;
    this.obsidian = smart_fs.env.main.obsidian;
    this.obsidian_app = smart_fs.env.main.app;
    // scoped to env_path by default
    this.obsidian_adapter = smart_fs.env.main.app.vault.adapter;
  }
  get fs_path() { return this.smart_fs.fs_path; }

  /**
   * Append content to a file
   * 
   * @param {string} rel_path - The relative path of the file to append to
   * @param {string} data - The content to append
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async append(rel_path, data) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    return await this.obsidian_adapter.append(rel_path, data);
  }

  /**
   * Create a new directory
   * 
   * @param {string} rel_path - The relative path of the directory to create
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async mkdir(rel_path) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    return await this.obsidian_adapter.mkdir(rel_path);
  }

  /**
   * Check if a file or directory exists
   * 
   * @param {string} rel_path - The relative path to check
   * @returns {Promise<boolean>} True if the path exists, false otherwise
   */
  async exists(rel_path) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    return await this.obsidian_adapter.exists(rel_path);
  }

  /**
   * List files in a directory
   * 
   * @param {string} rel_path - The relative path to list
   * @returns {Promise<string[]>} Array of file paths
   */
  async list(rel_path, opts={}) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    if(rel_path.startsWith('/')) rel_path = rel_path.slice(1);
    if(rel_path.endsWith('/')) rel_path = rel_path.slice(0, -1);
    // handle hidden files and folders (getAllLoadedFiles excludes hidden files and folders)
    if(rel_path.includes('.')){ 
      const {files: file_paths} = await this.obsidian_adapter.list(rel_path);
      const files = file_paths.map(file_path => {
        if(this.smart_fs.fs_path) file_path = file_path.replace(this.smart_fs.fs_path, '').slice(1);
        const file_name = file_path.split('/').pop();
        const file = {
          basename: file_name.split('.')[0],
          extension: file_name.split('.').pop(),
          name: file_name,
          path: file_path,
        };
        return file;
      });
      return files;
    }
    const files = this.obsidian_app.vault.getAllLoadedFiles()
      .filter((file) => {
        const last_slash = file.path.lastIndexOf('/');
        if(last_slash === -1 && rel_path !== '') return false;
        const folder_path = file.path.slice(0, last_slash);
        if(folder_path !== rel_path) return false;
        return true;
      })
    ;
    return files;
  }
  // NOTE: currently does not handle hidden files and folders
  async list_recursive(rel_path, opts={}) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    if(rel_path.startsWith('/')) rel_path = rel_path.slice(1);
    if(rel_path.endsWith('/')) rel_path = rel_path.slice(0, -1);
    const files = this.obsidian_app.vault.getAllLoadedFiles()
      .filter((file) => {
        if(rel_path !== '' && !file.path.startsWith(rel_path)) return false;
        if(file instanceof this.obsidian.TFile){
          if(opts.type === 'folder') return false;
          file.type = 'file';
        }else if(file instanceof this.obsidian.TFolder){
          if(opts.type === 'file') return false;
          delete file.basename;
          delete file.extension;
          file.type = 'folder';
        }
        if(this.smart_fs.fs_path) file.path = file.path.replace(this.smart_fs.fs_path, '').slice(1);
        return true;
      })
    ;
    return files;
  }
  async list_files(rel_path) {
    return await this.list(rel_path, {type: 'file'});
  }
  async list_files_recursive(rel_path) {
    return await this.list_recursive(rel_path, {type: 'file'});
  }
  async list_folders(rel_path) {
    return await this.list(rel_path, {type: 'folder'});
  }
  async list_folders_recursive(rel_path) {
    return await this.list_recursive(rel_path, {type: 'folder'});
  }
  /**
   * Read the contents of a file
   * 
   * @param {string} rel_path - The relative path of the file to read
   * @returns {Promise<string>} The contents of the file
   */
  async read(rel_path, encoding) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    if(encoding === 'utf-8') {
      const tfile = this.obsidian_app.vault.getFileByPath(rel_path);
      if(tfile) return await this.obsidian_app.vault.cachedRead(tfile); // preferred
      return await this.obsidian_adapter.read(rel_path); // fallback
    }
    if(encoding === 'base64'){
      const array_buffer = await this.obsidian_adapter.readBinary(rel_path, 'base64');
      const base64 = this.obsidian.arrayBufferToBase64(array_buffer);
      return base64;
    }
    throw new Error(`Unsupported encoding: ${encoding}`);
  }

  /**
   * Rename a file or directory
   * 
   * @param {string} old_path - The current path of the file or directory
   * @param {string} new_path - The new path for the file or directory
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async rename(old_path, new_path) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    return await this.obsidian_adapter.rename(old_path, new_path);
  }

  /**
   * Remove a file
   * 
   * @param {string} rel_path - The relative path of the file to remove
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async remove(rel_path) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    try{
      return await this.obsidian_adapter.remove(rel_path);
    }catch(error){
      console.warn(`Error removing file: ${rel_path}`, error);
    }
  }

  /**
   * Remove a directory
   * 
   * @param {string} rel_path - The relative path of the directory to remove
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async remove_dir(rel_path, recursive=false) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    return await this.obsidian_adapter.rmdir(rel_path, { recursive });
  }

  /**
   * Get file or directory information
   * 
   * @param {string} rel_path - The relative path of the file or directory
   * @returns {Promise<Object>} An object containing file or directory information
   */
  async stat(rel_path) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    return await this.obsidian_adapter.stat(rel_path);
  }

  /**
   * Write content to a file
   * 
   * @param {string} rel_path - The relative path of the file to write to
   * @param {string} data - The content to write
   * @returns {Promise<void>} A promise that resolves when the operation is complete
   */
  async write(rel_path, data) {
    if (!rel_path.startsWith(this.fs_path)) rel_path = this.fs_path + '/' + rel_path;
    return await this.obsidian_adapter.write(rel_path, data);
  }

  get_link_target_path(link_path, file_path) {
    return this.obsidian_app.metadataCache.getFirstLinkpathDest(link_path, file_path)?.path;
  }

}