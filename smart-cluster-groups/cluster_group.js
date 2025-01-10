/**
 * @file cluster_group.js
 * @description Represents a group of clusters, extends SmartGroup.
 */

import { SmartGroup } from 'smart-groups';
import { Cluster } from 'smart-clusters';


/**
 * @class ClusterGroup
 * @extends SmartGroup
 * @classdesc
 * Represents a group of clusters, holding global filters & references to multiple clusters.
 * 
 * Data fields:
 *  - cluster_group.data.clusters: { "[cluster.key]": { filters: {...} } }
 *  - cluster_group.data.filters:  global cluster-group filters
 */
export class ClusterGroup extends SmartGroup {
  /**
   * @constructor
   * @param {Object} env 
   * @param {Object|null} [opts=null]
   */
  constructor(env, opts = null) {
    super(env, opts);
  }

  /**
   * Overridden init logic:
   * If data.key is missing, set it to timestamp at creation, per specs.
   */
  init() {
    super.init();
    if (!this.data.key) {
      this.data.key = Date.now(); // timestamp at creation
    }
  }

  /**
   * Create or update the group when adding a cluster
   * @param {Cluster} cluster
   * @returns {ClusterGroup} updated or newly created group instance
   */
  add_cluster(cluster) {
    const ck = cluster.key;
    if (!this.data.clusters) this.data.clusters = {};
    if (!this.data.clusters[ck]) {
      this.data.clusters[ck] = { filters: {} };
    } else {
      // merge updated filter data if any
      Object.assign(this.data.clusters[ck].filters, {});
    }
    return this;
  }

  /**
   * @method new_group_from_data
   * @description
   * Creates a brand new ClusterGroup instance from the given data object.
   * This is used by `Cluster.add_center()` to produce a distinct group copy.
   * @param {Object} data 
   * @returns {ClusterGroup}
   */
  new_group_from_data(data) {
    // Build new opts copying all relevant fields from 'this.opts' or new object
    const new_opts = {
      ...this.opts,  // preserve any existing config
      data,          // override the data with new copy
    };
    // create a new instance
    const new_group = new ClusterGroup(this.env, new_opts);
    // ensure init is called
    new_group.init();
    return new_group;
  }

  /**
   * get_snapshot
   * @param {Object[]} items 
   * @returns {Object}
   */
  get_snapshot(items) {
    // minimal structural summary
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

    // populate members if we want to iterate items or do something more advanced
    (items || []).forEach(item => {
      const row = { item };
      snapshot.clusters.forEach(({ key: ckey }) => {
        row[ckey] = {
          score: 0, // or cos_sim if item has a vector
          state: (item.data.clusters && item.data.clusters[ckey]) || 0
        };
      });
      snapshot.members.push(row);
    });

    return snapshot;
  }
}

export default ClusterGroup;
