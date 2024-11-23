import { SmartEntity } from "smart-entities";

export class SmartDirectory extends SmartEntity {
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
    // await this.create(this.data.path);
    this.queue_save();
  }

  get fs() { return this.env.smart_sources.fs; }

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
    return this.env.smart_directories.filter(dir => 
      dir.data.path.startsWith(this.data.path) && 
      dir.data.path !== this.data.path
    );
  }

  /**
   * Gets only direct child directories
   */
  get direct_subdirectories() {
    return this.subdirectories.filter(dir => {
      const relative_path = dir.data.path.slice(this.data.path.length);
      return !relative_path.slice(1).includes('/');
    });
  }

  /**
   * Gets the median vector of all contained sources
   */
  get median_vec() {
    if (this.data.median_vec) return this.data.median_vec;
    
    const source_vecs = this.sources
      .map(source => source.vec)
      .filter(vec => vec);

    if (!source_vecs.length) return null;

    const vec_length = source_vecs[0].length;
    const median_vec = new Array(vec_length);
    const mid = Math.floor(source_vecs.length / 2);

    for (let i = 0; i < vec_length; i++) {
      const values = source_vecs.map(vec => vec[i]).sort((a, b) => a - b);
      median_vec[i] = source_vecs.length % 2 !== 0
        ? values[mid]
        : (values[mid - 1] + values[mid]) / 2;
    }

    this.data.median_vec = median_vec;
    // this.queue_save();
    return median_vec;
  }

  /**
   * Gets the median vector of all contained blocks
   */
  get median_block_vec() {
    if (this.data.median_block_vec) return this.data.median_block_vec;
    
    const block_vecs = this.sources
      .flatMap(source => source.blocks)
      .map(block => block.vec)
      .filter(vec => vec);

    if (!block_vecs.length) return null;

    const vec_length = block_vecs[0].length;
    const median_vec = new Array(vec_length);
    const mid = Math.floor(block_vecs.length / 2);

    for (let i = 0; i < vec_length; i++) {
      const values = block_vecs.map(vec => vec[i]).sort((a, b) => a - b);
      median_vec[i] = block_vecs.length % 2 !== 0
        ? values[mid]
        : (values[mid - 1] + values[mid]) / 2;
    }

    this.data.median_block_vec = median_vec;
    // this.queue_save();
    return median_vec;
  }

  /**
   * Performs a lookup within this directory's sources
   */
  async lookup(opts = {}) {
    return await this.env.smart_sources.lookup({
      ...opts,
      filter: {
        ...(opts.filter || {}),
        key_starts_with: this.data.path
      }
    });
  }

  // Add method to update directory statistics
  async update_stats() {
    const sources = this.sources;
    this.data.metadata.stats = {
      total_files: sources.length,
      total_size: sources.reduce((sum, src) => sum + (src.size || 0), 0),
      last_scan: Date.now()
    };
    this.queue_save();
  }

  // Add method to manage directory labels
  async update_label(label, q_score, block_key = null) {
    if (!this.data.metadata.labels[label]) {
      this.data.metadata.labels[label] = {
        q_score: 0,
        supporting_blocks: {}
      };
    }
    
    if (block_key) {
      this.data.metadata.labels[label].supporting_blocks[block_key] = q_score;
    }
    
    // Recalculate overall q-score for label
    const scores = Object.values(this.data.metadata.labels[label].supporting_blocks);
    this.data.metadata.labels[label].q_score = 
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    this.queue_save();
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