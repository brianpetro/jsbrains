export class ObsidianFsAdapter {
  constructor(data_adapter) {
    this.data_adapter = data_adapter;
  }

  async access(path) {
    const exists = await this.data_adapter.exists(path);
    if (!exists) {
      throw new Error(`ENOENT: no such file or directory, access '${path}'`);
    }
  }

  async appendFile(path, data, options) {
    return await this.data_adapter.append(path, data, options);
  }

  async chmod(path, mode) {
    throw new Error('Not implemented');
  }

  async chown(path, uid, gid) {
    throw new Error('Not implemented');
  }

  async copyFile(src, dest) {
    return await this.data_adapter.copy(src, dest);
  }

  async lchmod(path, mode) {
    throw new Error('Not implemented');
  }

  async lchown(path, uid, gid) {
    throw new Error('Not implemented');
  }

  async link(existingPath, newPath) {
    throw new Error('Not implemented');
  }

  async lstat(path) {
    return await this.data_adapter.stat(path);
  }

  async mkdir(path, options) {
    return await this.data_adapter.mkdir(path);
  }

  async mkdtemp(prefix) {
    throw new Error('Not implemented');
  }

  async open(path, flags, mode) {
    throw new Error('Not implemented');
  }

  async readdir(path, options) {
    return await this.data_adapter.list(path);
  }

  async readFile(path, options) {
    return await this.data_adapter.read(path);
  }

  async readlink(path, options) {
    throw new Error('Not implemented');
  }

  async realpath(path, options) {
    return await this.data_adapter.getResourcePath(path);
  }

  async rename(oldPath, newPath) {
    return await this.data_adapter.rename(oldPath, newPath);
  }

  async rmdir(path, options) {
    return await this.data_adapter.rmdir(path, options.recursive);
  }

  async stat(path, options) {
    return await this.data_adapter.stat(path);
  }

  async symlink(target, path, type) {
    throw new Error('Not implemented');
  }

  async truncate(path, len) {
    throw new Error('Not implemented');
  }

  async unlink(path) {
    return await this.data_adapter.remove(path);
  }

  async utimes(path, atime, mtime) {
    throw new Error('Not implemented');
  }

  async writeFile(path, data, options) {
    return await this.data_adapter.write(path, data, options);
  }
}