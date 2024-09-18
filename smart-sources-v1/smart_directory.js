import { SmartEntity } from "smart-entities";

export class SmartDirectory extends SmartEntity {
  static get defaults() {
    return {
      data: {
        path: '',
      },
    };
  }

  async init() {
    this.data.path = this.data.path.replace(/\\/g, "/");
    await this.create(this.data.path);
    this.queue_save();
  }

  get fs() { return this.env.fs; }

  get file_type() { return 'directory'; }
  
  get smart_embed() { return false; }

  async read() {
    const contents = await this.fs.list(this.data.path);
    return contents.map(item => ({
      path: item.path,
      type: item.type
    }));
  }

  async move_to(new_path) {
    const old_path = this.data.path;

    if (!(await this.fs.exists(old_path))) {
      throw new Error(`Directory not found: ${old_path}`);
    }

    // Ensure the parent directory of the new path exists
    const parent_dir = new_path.split('/').slice(0, -1).join('/');
    if (parent_dir && !(await this.fs.exists(parent_dir))) {
      await this.fs.mkdir(parent_dir, { recursive: true });
    }

    // Perform the move operation
    await this.fs.rename(old_path, new_path);
    this.data.path = new_path;
    this.queue_save();
  }

  async remove() {
    await this.fs.remove_dir(this.data.path);
    await this.delete();
  }

  async create(path) {
    if (await this.fs.exists(path)) {
      const stat = await this.fs.stat(path);
      if (stat.isFile()) {
        throw new Error(`Cannot create directory: A file with the same name already exists at ${path}`);
      }
    } else {
      await this.fs.mkdir(path, { recursive: true });
    }
  }

  // These methods are not supported for directories
  async append() { throw new Error("append method not supported for directory"); }
  async update() { throw new Error("update method not supported for directory"); }
  async _update() { throw new Error("_update method not supported for directory"); }
  async _read() { throw new Error("_read method not supported for directory"); }
  async merge() { throw new Error("merge method not supported for directory"); }
}