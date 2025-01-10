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
 * @description
 * Represents a single cluster with a center (or multiple center items), plus membership info.
 */
export class Cluster extends SmartEntity {
  static get defaults() {
    return {
      data: {
        key: null,
        center: {}, // e.g. { itemKey: { weight: number } }
        center_vec: null, // optional
        members: {}       // e.g. { itemKey: { state: -1|0|1 } }
      }
    };
  }

  init() {
    super.init();
    // If no key yet and we have a group, produce a stable key from group.key + murmur(JSON(center)).
    if (!this.data.key && this.group) {
      const group_key = this.group.key || 'unknown_group';
      const center_str = JSON.stringify(this.data.center || {});
      this.data.key = group_key + '#' + murmur(center_str);
    }
  }

  /**
   * @method add_member
   * @param {Object} item A 'SmartEntity'-like object with .key, .vec
   * @returns {Object} membership summary
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
   * @param {Object} item
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
   * Creates a new cluster based on this one (adding 'item' as an additional center),
   * then creates/returns a new group instance that references that new cluster.
   */
  add_center(item) {
    // 1) Copy this cluster's data
    const new_data = JSON.parse(JSON.stringify(this.data));
    if (!new_data.center) new_data.center = {};
    new_data.center[item.key] = { weight: 1 };

    // 2) Use create_or_update on our clusters collection instead of "new Cluster(...)" 
    const cluster_collection = this.collection; // e.g. 'clusters' 
    const new_cluster = cluster_collection.create_or_update({ data: new_data });

    // 3) Copy the group data, remove old cluster reference, add new cluster reference
    const old_group_data = JSON.parse(JSON.stringify(this.group.data));
    if (old_group_data.clusters) delete old_group_data.clusters[this.key];
    if (!old_group_data.clusters) old_group_data.clusters = {};
    old_group_data.clusters[new_cluster.key] = { filters: {} };

    // 4) Build a new group from the updated data
    const new_group = this.group.new_group_from_data(old_group_data);
    return new_group;
  }

  get vec() {
    return this.data.center_vec || [];
  }
  set vec(value) {
    this.data.center_vec = value;
  }

}