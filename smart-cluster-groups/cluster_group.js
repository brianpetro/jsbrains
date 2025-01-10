/****************************************
 * cluster_group.js (Updated)
 ****************************************/
import { SmartGroup } from 'smart-groups';
import { Cluster } from 'smart-clusters';

/**
 * @class ClusterGroup
 * @extends SmartGroup
 */
export class ClusterGroup extends SmartGroup {
  init() {
    super.init();
    if (!this.data.key) {
      this.data.key = Date.now(); // timestamp at creation
    }
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

  /**
   * get_snapshot example for user display
   */
  get_snapshot(items) {
    const snapshot = {
      clusters: [],
      members: [],
      view: { ...this.data.filters }
    };
    if (!this.data.clusters) return snapshot;

    // populate cluster list
    snapshot.clusters = Object.keys(this.data.clusters).map(k => {
      return { key: k, ...this.data.clusters[k] };
    });

    // optional membership details
    (items || []).forEach(item => {
      const row = { item };
      snapshot.clusters.forEach(({ key: ckey }) => {
        row[ckey] = {
          score: 0,
          state: (item.data.clusters && item.data.clusters[ckey]) || 0
        };
      });
      snapshot.members.push(row);
    });

    return snapshot;
  }

}