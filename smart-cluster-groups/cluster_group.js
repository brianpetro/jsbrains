import { CollectionItem } from 'smart-collections';
import { cos_sim } from '../smart-entities/utils/cos_sim.js';

/**
 * @class ClusterGroup
 * @extends CollectionItem
 */
export class ClusterGroup extends CollectionItem {
  static get defaults() {
    return {
      data: {
        key: Date.now().toString(),
        clusters: {}
      }
    };
  }

  /**
   * Adds or updates cluster reference in the group
   */
  add_cluster(cluster) {
    const ck = cluster.key;
    if (!this.data.clusters) this.data.clusters = {};
    if (!this.data.clusters[ck]) {
      this.data.clusters[ck] = { filters: {} };
    } else {
      // merge updated filter data or overrides
      Object.assign(this.data.clusters[ck].filters, {});
    }
    return this;
  }

  /**
   * Creates a new cluster group by cloning this one
   * @param {Object} opts
   * @param {Array} [opts.remove_clusters] - Array of cluster keys to remove
   * @param {Array} [opts.add_clusters] - Array of cluster keys to add
   * @returns {Promise<ClusterGroup>}
   */
  async clone(opts = {}) {
    const new_clusters = (opts.add_clusters || []).reduce((acc, key) => {
      acc[key] = { filters: {} };
      return acc;
    }, {});
    const clusters = Object.entries(this.data.clusters)
      .filter(([key, value]) => !opts.remove_clusters.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, new_clusters);
    const new_group = await this.env.cluster_groups.create_or_update({ clusters });
    return new_group;
  }
  

  get clusters(){
    return this.env.clusters.get_many(Object.keys(this.data.clusters));
  }

  /**
   * get_snapshot example for user display
   */
  async get_snapshot(items) {
    if (!this.data.clusters) return { clusters: [], members: [], filters: { ...this.data.filters } };
    if(!items) items = Object.values(this.env.smart_sources.items);
    items = items.filter(i => i.vec); // ensure items have vectors
    const members = [];
    for(let i = 0; i < items.length; i++) {
      const item = items[i];
      const membership = {
        item,
        clusters: {}
      };
      for(let j = 0; j < this.clusters.length; j++) {
        const cluster = this.clusters[j];
        const sim = cos_sim(cluster.vec, item.vec);
        membership.clusters[cluster.key] = {
          score: sim,
        };
      }
      members.push(membership);
    }

    return {
      clusters: this.clusters,
      members,
      filters: { ...this.data.filters }
    };
  }

}