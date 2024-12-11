import { SmartEntity } from "smart-entities";

export class SmartCluster extends SmartEntity {
  static get defaults() {
    return {
      data: {
        key: null,
        member_keys: [],
        centroid_vec: null,
        last_clustered_at: 0,
        size: 0,
        name: '',
        config: {}
      },
    };
  }

  constructor(env, data = {}) {
    super(env, data);
  }

  /**
   * Recalculate centroid of this cluster using either mean or median of members' embeddings.
   */
  recalculate_centroid() {
    if (!this.member_keys?.length) {
      this.data.centroid_vec = null;
      return;
    }

    const member_vectors = this.member_keys
      .map(key => this.get_item_vector(key))
      .filter(vec => vec && Array.isArray(vec));

    if (!member_vectors.length) {
      this.data.centroid_vec = null;
      return;
    }

    const vec_length = member_vectors[0].length;
    const all_values = member_vectors.map(v => v.slice());

    if (this.data.config.centroid_type === 'median') {
      // median centroid
      const median_vec = [];
      for (let i = 0; i < vec_length; i++) {
        const vals = all_values.map(vec => vec[i]).sort((a, b) => a - b);
        const mid = Math.floor(vals.length / 2);
        median_vec[i] = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
      }
      this.data.centroid_vec = median_vec;
    } else {
      // mean centroid (default)
      const sum_vec = new Array(vec_length).fill(0);
      for (const vec of all_values) {
        for (let i = 0; i < vec_length; i++) {
          sum_vec[i] += vec[i];
        }
      }
      const mean_vec = sum_vec.map(val => val / all_values.length);
      this.data.centroid_vec = mean_vec;
    }
  }

  /**
   * Retrieves vector for a given item key.
   * Currently assumes items are from smart_sources or smart_blocks.
   * Extend as needed for other collections.
   * @param {string} item_key
   */
  get_item_vector(item_key) {
    const source = this.env.smart_sources.get(item_key) || this.env.smart_blocks.get(item_key);
    return source?.vec || null;
  }

  /**
   * Generate a name for the cluster from its members.
   * Simple heuristic: take top few member names and join them.
   */
  generate_name() {
    const items = this.member_keys.map(key => this.env.smart_sources.get(key) || this.env.smart_blocks.get(key))
      .filter(item => item);

    const names = items.map(it => it.name || it.key);
    // Simple name: first 2-3 item names joined
    this.data.name = names.slice(0, 3).join(", ") + (names.length > 3 ? "..." : "");
  }

  async save() {
    await this.env.smart_clusters.data_adapter.save(this);
  }

  get member_keys() { return this.data.member_keys; }

  set member_keys(keys) {
    this.data.member_keys = keys;
    this.data.size = keys.length;
  }
}
