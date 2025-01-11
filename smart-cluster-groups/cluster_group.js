/****************************************
 * cluster_group.js (Updated)
 ****************************************/
import { SmartGroup } from 'smart-groups';
import { Cluster } from 'smart-clusters';
import { cos_sim } from '../smart-entities/utils/cos_sim.js';

/**
 * @class ClusterGroup
 * @extends SmartGroup
 */
export class ClusterGroup extends SmartGroup {
  init() {
    // muted
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
   * Creates a brand new ClusterGroup by copying 'data',
   * but uses create_or_update from the group collection to do so.
   */
  new_group_from_data(data) {
    // Create a new item in the clusterGroups collection
    return this.collection.create_or_update({
      data
    });
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