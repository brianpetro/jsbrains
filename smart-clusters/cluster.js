/**
 * @file cluster.js
 * @description Implements the Cluster class based on the provided specs.
 */
import { SmartEntity } from 'smart-entities';
import { cos_sim } from 'smart-entities/utils/cos_sim.js';
import { murmur_hash_32_alphanumeric as murmur } from './utils/create_hash.js';

/**
 * @class Cluster
 * @extends SmartEntity
 * @classdesc
 * Represents a single cluster with a center (or multiple center items), plus membership info.
 * 
 * Data fields:
 *  - cluster.data.key
 *  - cluster.data.center
 *  - cluster.data.center_vec (optional)
 *  - cluster.data.members
 * 
 * Methods:
 *  - add_member(item)
 *  - remove_member(item)
 *  - add_center(item)
 */
export class Cluster extends SmartEntity {
  /**
   * @constructor
   * @param {Object} env - The environment/context.
   * @param {Object|null} [opts=null] - Optional data or overrides.
   */
  constructor(env, opts = null) {
    super(env, opts);
  }

  /**
   * Default data structure for a cluster, based on specs.
   * @returns {Object}
   */
  static get defaults() {
    return {
      data: {
        // cluster_group.key + '#' + murmur(JSON.stringify(this.data.center))
        key: null,
        center: {},       // { [itemKey]: { weight: number } }
        center_vec: null, // optional
        members: {},      // { [itemKey]: { state: -1 | 0 | 1 } }
      }
    };
  }
  /**
   * Ensures the cluster key is generated from the cluster_group key plus murmur(center).
   * If no group is present, fallback to random or existing key.
   */
  init() {
    super.init();
    if (!this.data.key && this.group) {
      const group_key = this.group.key || 'unknown_group';
      const center_str = JSON.stringify(this.data.center || {});
      this.data.key = group_key + '#' + murmur(center_str);
    }
  }

  /**
   * @method add_member
   * @description
   * Updates cluster.data.members[item.key] = { state: 1 }  
   * Also sets item.data.clusters[cluster.key] = 1  
   * Returns an object summarizing membership updates, e.g. { [cluster.key]: { score, state: 1 }}
   * @param {Object} item - The item to add as a member.
   * @returns {Object} An object summarizing membership updates.
   */
  add_member(item) {
    if (!this.data.members) this.data.members = {};
    this.data.members[item.key] = { state: 1 };
    if (!item.data.clusters) item.data.clusters = {};
    item.data.clusters[this.key] = 1;

    const cluster_vec = this.data.center_vec || this.vec || [];
    const item_vec = item.vec || [];
    const similarity_score = cos_sim(cluster_vec, item_vec);

    return {
      [this.key]: {
        score: similarity_score,
        state: 1
      }
    };
  }

  /**
   * @method remove_member
   * @description
   * Sets cluster.data.members[item.key] = { state: -1 }.  
   * Updates item.data.clusters[cluster.key] = -1.  
   * Returns true.
   * 
   * @param {Object} item - The item to remove from membership.
   * @returns {boolean}
   */
  remove_member(item) {
    if (!this.data.members) this.data.members = {};
    this.data.members[item.key] = { state: -1 };
    if (!item.data.clusters) item.data.clusters = {};
    item.data.clusters[this.key] = -1;
    return true;
  }

  /**
   * @method add_center
   * @description
   * Creates a new cluster by copying this cluster's data and adding 'item' to new_data.center.  
   * Creates a new cluster group by copying this.group's data, removing [this.key], and adding [new_cluster.key] = {filters:{}}.  
   * Returns the new group instance (which includes the newly created cluster).
   * 
   * @param {Object} item - The new center item.
   * @returns {Object} The new cluster_group instance.
   */
  add_center(item) {
    // Prepare new cluster data
    const new_data = JSON.parse(JSON.stringify(this.data));
    if (!new_data.center) new_data.center = {};
    new_data.center[item.key] = { weight: 1 };

    // Create a new cluster instance
    const new_cluster = new Cluster(this.env, { data: new_data });
    new_cluster.init(); // ensure key is set

    // Create a new group by copying current group data
    const old_group_data = JSON.parse(JSON.stringify(this.group.data));

    // remove old cluster entry
    if (old_group_data.clusters) {
      delete old_group_data.clusters[this.key];
    }
    // add new cluster entry
    if (!old_group_data.clusters) old_group_data.clusters = {};
    old_group_data.clusters[new_cluster.key] = { filters: {} };

    // build new group instance
    const new_group = this.group.new_group_from_data(old_group_data);

    // Return that new group
    return new_group;
  }

  /**
   * Optional getter for cluster-level vec
   * @returns {number[]}
   */
  get vec() {
    return this.data.center_vec || [];
  }

  /**
   * For setting center_vec if needed
   */
  set vec(value) {
    this.data.center_vec = value;
  }

}

export default Cluster;
