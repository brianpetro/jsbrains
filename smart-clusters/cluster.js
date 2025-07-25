/**
 * @file cluster.js
 * @description Implements the Cluster class based on the provided specs,
 *              overriding get_key to use sim_hash for the cluster key.
 */
import { CollectionItem } from 'smart-collections';
import { cos_sim } from 'smart-utils/cos_sim.js';
import { compute_centroid } from 'smart-utils/geom.js';
import { sim_hash } from 'smart-utils/sim_hash.js';

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
        center: {},          // e.g. { itemKey: { weight: number } }
        center_vec: null,    // optional
        members: {},         // e.g. { itemKey: { state: -1|0|1 } }
        filters: {},
        group_key: null
      }
    };
  }

  // API METHODS
  /**
   * @method add_member
   * @param {CollectionItem} item - Should be SmartEntity sub-type (includes `vec`)
   * @returns {Object} membership summary
   * FUTURE: add opts.output_type to change output format to array of { item, score, state }
   */
  add_member(item) {
    item = this.#validate_member_item(item);
    this.#update_member_data(item, 1);
    this.#update_item_cluster_data(item, 1);
    const similarity_score = this.vec && item.vec
      ? cos_sim(this.vec, item.vec)
      : undefined
    ;
    return {
      [this.key]: {
        item,
        score: similarity_score,
        state: 1
      }
    };
  }
  /**
   * @method add_members
   * @param {Array} items - Array of items to add to the cluster
   * @returns {Object} - Object with item keys as keys and membership summary as values
   */
  add_members(items) {
    const results = {};
    for(let i = 0; i < items.length; i++) {
      const result = this.add_member(items[i]);
      if(result) results[items[i].key] = result[this.key];
    }
    return results;
  }
  /**
   * @method remove_member
   * @param {Object} item
   * @returns {boolean}
   */
  remove_member(item) {
    item = this.#validate_member_item(item);
    this.#update_member_data(item, -1);
    this.#update_item_cluster_data(item, -1);
    return true;
  }
  /**
   * @method remove_members
   * @param {Array} items - Array of items to remove from the cluster
   * @returns {Object} - Object with item keys as keys and membership summary as values
   */
  remove_members(items) {
    for(let i = 0; i < items.length; i++) {
      this.remove_member(items[i]);
    }
  }
  /**
   * @method add_centers
   * @description
   * Creates a new cluster (adding 'items' as additional centers) and a new group
   * that references that new cluster in place of this one.
   * @param {Array} items - Array of items to become additional centers
   * @returns {Promise<{new_cluster: Cluster, new_cluster_group: ClusterGroup}>} - The newly created group (replacing this cluster with the new one)
   */
  async add_centers(items) {
    items = items.map(item => this.#validate_member_item(item));
    const new_cluster = await this.#clone({ add_centers: items.map(item => item.key) });
    const new_cluster_group = await this.cluster_group.clone({
      remove_clusters: [this.key],
      add_clusters: [new_cluster.key]
    });
    return {new_cluster, new_cluster_group};
  }
  /**
   * @method add_center
   * @description
   * Creates a new cluster (adding 'item' as an additional center) and a new group
   * that references that new cluster in place of this one.
   * @param {Object|string} item|item_key - The item to become an additional center
   * @returns {Promise<{new_cluster: Cluster, new_cluster_group: ClusterGroup}>} - The newly created group (replacing this cluster with the new one)
   */
  async add_center(item) {
    return await this.add_centers([item]);
  }
  /**
   * @method remove_center
   * @description
   * Creates a new cluster (removing 'item' as a center) and a new group
   * that references that new cluster in place of this one.
   * @param {Object|string} item|item_key - The item to remove as a center
   * @returns {Promise<{new_cluster: Cluster, new_cluster_group: ClusterGroup}>} - The newly created group (replacing this cluster with the new one)
   */
  async remove_center(item) {
    return await this.remove_centers([item]);
  }
  /**
   * @method remove_centers
   * @description
   * Creates a new cluster (removing 'items' as centers) and a new group
   * that references that new cluster in place of this one.
   * @param {Array} items - Array of items to remove as centers
   * @returns {Promise<{new_cluster: Cluster, new_cluster_group: ClusterGroup}>} - The newly created group (replacing this cluster with the new one)
   */
  async remove_centers(items) {
    items = items.map(item => this.#validate_member_item(item));
    if(items.length === Object.keys(this.data.center).length) throw new Error('Cannot remove all centers from cluster');
    const new_cluster = await this.#clone({ remove_centers: items.map(item => item.key) });
    const new_cluster_group = await this.cluster_group.clone({
      remove_clusters: [this.key],
      add_clusters: [new_cluster.key]
    });
    return {new_cluster, new_cluster_group};
  }

  // PRIVATE METHODS
  /**
   * @method #clone
   * @description
   * Creates a new cluster by cloning this one, then returns a new group
   * that references this new cluster in place of the old one.
   * @param {Object} opts
   * @param {Array} [opts.remove_centers] - Array of center keys to remove
   * @param {Array} [opts.add_centers] - Array of center keys to add
   * @returns {Promise<ClusterGroup>}
   */
  async #clone(opts = {}) {
    const new_data = {
      ...JSON.parse(JSON.stringify(this.data || {})),
      // filters: {}, // keep filters
      // members: {}, // keep members
      // center: {}, // keep centers (will be recomputed)
      key: null,
      center_vec: null,
      group_key: null
    };
    if(!new_data.center) new_data.center = {};
    opts.remove_centers = opts.remove_centers?.map(center => typeof center === 'string' ? center : center.key) || [];
    opts.add_centers = opts.add_centers?.map(center => typeof center === 'string' ? center : center.key) || [];
    if(opts.remove_centers) {
      for(let i = 0; i < opts.remove_centers.length; i++) {
        delete new_data.center[opts.remove_centers[i]];
      }
    }
    if(opts.add_centers) {
      for(let i = 0; i < opts.add_centers.length; i++) {
        new_data.center[opts.add_centers[i]] = { weight: 1 };
      }
    }
    const new_cluster = this.collection.create_or_update(new_data);
    return new_cluster;
  }
  /**
   * @method #update_member_data
   * @param {CollectionItem} item - The item to update
   * @param {number} state - The new state of the item (1 for added, -1 for removed)
   */
  #update_member_data(item, state) {
    if (!this.data.members) this.data.members = {};
    this.data.members[item.key] = { state };
    this.queue_save();
  }
  /**
   * @method #update_item_cluster_data
   * @param {CollectionItem} item - The item to update
   * @param {number} state - The new state of the item (1 for added, -1 for removed)
   */
  #update_item_cluster_data(item, state) {
    if (!item.data.clusters) item.data.clusters = {};
    item.data.clusters[this.key] = state;
    item.queue_save();
  }
  /**
   * @method #validate_member_item
   * @description
   * Validates an item or item key, ensuring it's an object with a .key property.
   * @param {Object|string} item|item_key - The item or item key to validate
   * @returns {Object} - The validated item
   */
  #validate_member_item(item) {
    if (typeof item === 'string') item = this.env.smart_sources.get(item);
    if (!item) throw new Error('validate_item(): Item not found');
    return item;
  }

  // GETTERS
  /**
   * @property centers
   */
  get centers() {
    const center_keys = Object.keys(this.data.center || {});
    return this.env.smart_sources.get_many(center_keys);
  }
  get last_cluster_group_key() {
    return Object.keys(this.env.cluster_groups.items)
      .filter(key => key.includes(this.key))
      .sort() // sort orders by preceeding timestamp
      .pop();
  }
  get cluster_group() {
    return this.env.cluster_groups.get(this.last_cluster_group_key);
  }
  /**
   * @property filters
   * @description
   * Returns the cluster-level filters (if any)
   */
  get filters() {
    return this.data.filters;
  }

  get name() {
    // get the key of the center item with highest cos_sim to this.vec
    const center_keys = Object.keys(this.data.center || {});
    if(center_keys.length === 1) return center_keys[0];
    const center_vecs = center_keys.map(key => this.env.smart_sources.get(key).vec);
    const sim_scores = center_vecs.map(vec => cos_sim(this.vec, vec));
    const max_sim_index = sim_scores.indexOf(Math.max(...sim_scores));
    return center_keys[max_sim_index];
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
        .filter(c => c)
      ;
      if (center_vecs.length === 0) return undefined;
      if (center_vecs.length === 1) return center_vecs[0];
      this.vec = compute_centroid(center_vecs);
    }
    return this.data.center_vec;
  }

  set vec(value) {
    this.data.center_vec = value;
  }

  // BASE CLASS OVERRIDES
  /**
   * Override get_key to use sim_hash of this.vec. 
   * By default, we store the hash in this.data.key the first time it's computed
   * and reuse it to keep the key stable. If you want a live updated sim-hash key,
   * remove that caching logic.
   */
  get_key() {
    if (this.data.key) return this.data.key;
    const vector = this.vec;
    if(!vector) throw new Error('cluster.get_key(): No vector found for cluster');
    const new_sim_hash = sim_hash(vector);
    this.data.key = new_sim_hash;
    return new_sim_hash;
  }

  init() {
    if (!this.data.key) {
      // Access `this.key` so it gets set once, never changes.
      const _unused = this.key; // triggers get_key() 
    }
    this.queue_save();
  }

  /**
   * @override
   * Queues this item for saving with debounce
   */
  queue_save() {
    this._queue_save = true;
    if (this.collection._save_timeout) clearTimeout(this.collection._save_timeout);
    this.collection._save_timeout = setTimeout(() => {
      this.collection.process_save_queue();
    }, 1000); // 1 second debounce
    console.log('queue_save', this.key);
  }
}

