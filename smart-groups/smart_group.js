import { SmartEntity } from "smart-entities";

export class SmartGroup extends SmartEntity {
  static get defaults() {
    return {
      data: {
        path: '',
        median_vec: null,
        median_block_vec: null,
        member_collection: null,
        members: [], // Cache of contained member keys
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
  get group_adapter() {
    if(!this._group_adapter) {
      this._group_adapter = new this.collection.opts.group_adapter.item(this);
    }
    return this._group_adapter;
  }

  /**
   * Gets all SmartSources contained in this directory
   * @returns {SmartSource[]} Array of SmartSource instances
   */
  get members() {
    return this.member_collection.get_many(this.data.members);
  }
  get member_collection() {
    return this.env[this.member_collection_key];
  }
  get member_collection_key() {
    return this.data.member_collection || 'smart_sources';
  }

  async get_nearest_members() {
    if(!this.group_vec) {
      console.log(`no median vec for directory: ${this.data.path}`);
      return [];
    }
    return this.vector_adapter.nearest_members();
  }
  async get_furthest_members() {
    if(!this.group_vec) {
      console.log(`no median vec for directory: ${this.data.path}`);
      return [];
    }
    return this.vector_adapter.furthest_members();
  }

  /**
   * Gets the median vector of all contained sources
   */
  get median_vec() {
    return this.entity_adapter.median_vec;
  }
  get vec() { return this.median_vec; }
  get group_vec() { return this.median_vec; }

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
    return median_vec;
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

}