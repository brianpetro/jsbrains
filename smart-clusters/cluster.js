/**
 * @file cluster.js
 * @description Implements the Cluster class based on the provided specs,
 *              overriding get_key to use sim_hash for the cluster key.
 */
import { CollectionItem } from 'smart-collections';
import { cos_sim } from 'smart-entities/utils/cos_sim.js';
import { compute_centroid } from './utils/geom.js';
import { sim_hash } from './utils/sim_hash.js';

/**
 * @class Cluster
 * @extends CollectionItem
 * @description
 * Represents a single cluster with a center (or multiple center items), plus membership info.
 */
export class Cluster extends CollectionItem {
  static get defaults() {
    return {
      data: {
        key: null,
        sim_key: null,       // <--- store a stable sim-hash once created
        center: {},          // e.g. { itemKey: { weight: number } }
        center_vec: null,    // optional
        members: {},         // e.g. { itemKey: { state: -1|0|1 } }
        filters: {},
        group_key: null
      }
    };
  }

  /**
   * Override get_key to use sim_hash of this.vec. 
   * By default, we store the hash in this.data.sim_key the first time it's computed
   * and reuse it to keep the key stable. If you want a live updated sim-hash key,
   * remove that caching logic.
   */
  get_key() {
    if (this.data.sim_key) return this.data.sim_key;
    const vector = this.vec;
    if(!vector) throw new Error('cluster.get_key(): No vector found for cluster');
    const new_sim_hash = sim_hash(vector);
    this.data.sim_key = new_sim_hash;
    return new_sim_hash;
  }

  init() {
    if (!this.data.sim_key) {
      // Access `this.key` so it gets set once, never changes.
      const _unused = this.key; // triggers get_key() 
    }
  }

  /**
   * @method add_member
   * @param {Object} item - A 'SmartEntity'-like object with .key, .vec
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
   * Creates a new cluster (adding 'item' as an additional center) and a new group
   * that references that new cluster in place of this one.
   * @param {Object|string} item|item_key - The item to become an additional center
   * @returns {Object} - The newly created group (replacing this cluster with the new one)
   */
  async add_center(item) {
    item = this.validate_item(item);
    const new_data = JSON.parse(JSON.stringify(this.data));
    if (!new_data.center) new_data.center = {};
    new_data.center[item.key] = { weight: 1 };

    const new_cluster = this.collection.create_or_update({ data: new_data });

    const new_group = await this.group.clone({
      remove_clusters: [this.key],
      add_clusters: [new_cluster.key]
    });
    return new_group;
  }


  /**
   * @method remove_center
   * @description
   * Creates a new cluster with 'item' removed from center, then returns a new group
   * that references this new cluster in place of the old one.
   * @param {Object|string} item|item_key - The item to remove from center
   * @returns {Object} - The newly created group
   */
  async remove_center(item) {
    item = this.validate_item(item);
    const new_data = JSON.parse(JSON.stringify(this.data));
    if (new_data.center && new_data.center[item.key]) {
      delete new_data.center[item.key];
    }

    const new_cluster = this.collection.create_or_update({ data: new_data });

    const new_group = await this.group.clone({
      remove_clusters: [this.key],
      add_clusters: [new_cluster.key]
    });
    return new_group;
  }

  /**
   * @property centers
   */
  get centers() {
    const center_keys = Object.keys(this.data.center || {});
    return this.env.smart_sources.get_many(center_keys);
  }

  /**
   * @property vec
   * By spec, returns the centroid of all center items. 
   */
  get vec() {
    if(!this.data.center_vec) {
      const center_vecs = Object.entries(this.data.center || {})
        .map(([center_key, center_info]) => {
          // If center_info itself has a .vec, use it
          if (Array.isArray(center_info.vec)) return center_info.vec;
          // Otherwise try pulling the item from env
          const item = this.env.smart_sources.get(center_key);
          if (item && Array.isArray(item.vec)) return item.vec;
          console.warn(`No vector found for center ${center_key}`);
          return null;
        })
        .filter(Boolean);
      if (center_vecs.length === 0) return undefined;
      this.center_vec = compute_centroid(center_vecs);
    }
    return this.data.center_vec;
  }

  set vec(value) {
    this.data.center_vec = value;
  }


  /**
   * @property filters
   * @description
   * Returns the cluster-level filters (if any)
   */
  get filters() {
    return this.data.filters;
  }

  get cluster_group_key() {
    return Object.keys(this.data.cluster_groups).sort()[0];
  }

  get cluster_group() {
    return this.env.cluster_groups.get(this.cluster_group_key);
  }

}

