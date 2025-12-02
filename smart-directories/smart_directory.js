import { SmartGroup } from "smart-groups";

export class SmartDirectory extends SmartGroup {
  static get defaults() {
    return {
      data: {
        path: '',
        median_vec: null,
        median_block_vec: null,
        sources: [], // Cache of contained source keys
        metadata: {
          labels: {},        // Store directory labels/tags with q-scores
          last_modified: 0,  // Track directory changes
          stats: {           // Directory statistics
            total_files: 0,
            total_size: 0,
            last_scan: 0
          }
        }
      },
    };
  }

  async init() {
    this.data.path = this.data.path.replace(/\\/g, "/");
    this.queue_save();
  }

  get fs() { return this.env.smart_sources.fs; }

  get file_type() { return 'directory'; }

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

  /**
   * Gets all SmartSources contained in this directory
   * @returns {SmartSource[]} Array of SmartSource instances
   */
  get sources() {
    return this.env.smart_sources.filter(source => 
      source.path.startsWith(this.data.path)
    );
  }

  /**
   * @deprecated use get_nearest_members() instead
   */
  async get_nearest_sources_results() {
    return this.vector_adapter.nearest_members();
  }
  /**
   * @deprecated use get_furthest_members() instead
   */
  async get_furthest_sources_results() {
    return this.vector_adapter.furthest_members();
  }

  /**
   * Gets only direct child sources (excludes sources in subdirectories)
   */
  get direct_sources() {
    return this.sources.filter(source => {
      const relative_path = source.path.slice(this.data.path.length);
      return !relative_path.includes('/');
    });
  }

  /**
   * Gets all subdirectories
   */
  get subdirectories() {
    return this.env.smart_directories.filter({
      key_starts_with: this.data.path,
    });
  }

  /**
   * Gets only direct child directories
   */
  get direct_subdirectories() {
    return this.subdirectories.filter(dir => {
      const relative_path = dir.data.path.slice(this.data.path.length);
      return !relative_path.slice(0, -1).includes('/');
    });
  }

  /**
   * Gets the median vector of all contained sources
   */
  get median_vec() {
    return this.vector_adapter.median_vec;
  }
  get vec() { return this.median_vec; }


  /**
   * Gets the median vector of all contained blocks
   */
  get median_block_vec() {
    return this.vector_adapter.median_block_vec;
  }

  // Track directory changes
  async on_source_change(source_key) {
    this.data.metadata.last_modified = Date.now();
    await this.update_stats();
    this.data.median_vec = null; // Force recalculation
    this.data.median_block_vec = null;
    this.queue_save();
  }

}
