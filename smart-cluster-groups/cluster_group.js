import { CollectionItem } from 'smart-collections';
import { cos_sim } from 'smart-utils/cos_sim.js';

/**
 * @class ClusterGroup
 * @extends CollectionItem
 */
export class ClusterGroup extends CollectionItem {
  static get defaults() {
    return {
      data: {
        clusters: {},
        filters: {}
      }
    };
  }

  // API METHODS
  /**
   * @method get_snapshot
   * @description
   * Returns a snapshot of the cluster group for user display.
   * @param {Array} items - The items to include in the snapshot
   * @returns {Promise<Object>} - The snapshot
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
        if(cluster.data.members[item.key]?.state === -1) continue;
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

  /**
   * @method add_clusters
   * @description
   * Adds a cluster to the group.
   * @param {Array<Cluster>} clusters - The clusters to add
   * @returns {Promise<ClusterGroup>} - The new cluster group
   */
  async add_clusters(clusters) {
    return await this.clone({ add_clusters: clusters });
  }
  /**
   * @method add_cluster
   * @description
   * Adds a cluster to the group.
   * @param {Cluster} cluster - The cluster to add
   * @returns {Promise<ClusterGroup>} - The new cluster group
   */
  async add_cluster(cluster) {
    return await this.add_clusters([cluster.key]);
  }
  /**
   * @method remove_clusters
   * @description
   * Removes a cluster from the group.
   * @param {Array<Cluster>} clusters - The clusters to remove
   * @returns {Promise<ClusterGroup>} - The new cluster group
   */
  async remove_clusters(clusters) {
    return await this.clone({ remove_clusters: clusters });
  }
  /**
   * @method remove_cluster
   * @description
   * Removes a cluster from the group.
   * @param {Cluster} cluster - The cluster to remove
   * @returns {Promise<ClusterGroup>} - The new cluster group
   */
  async remove_cluster(cluster) {
    return await this.remove_clusters([cluster.key]);
  }

  /**
   * Creates a new cluster group by cloning this one
   * @param {Object} opts
   * @param {Array} [opts.remove_clusters] - Array of cluster keys to remove
   * @param {Array} [opts.add_clusters] - Array of cluster keys to add
   * @returns {Promise<ClusterGroup>}
   */
  async clone(opts = {}) {
    opts.add_clusters = opts.add_clusters?.map(c => typeof c === 'string' ? c : c.key);
    opts.remove_clusters = opts.remove_clusters?.map(c => typeof c === 'string' ? c : c.key);
    const new_clusters = (opts.add_clusters || []).reduce((acc, key) => {
      acc[key] = { filters: {} };
      return acc;
    }, {});
    const clusters = Object.entries(this.data.clusters)
      .filter(([key, value]) => !opts.remove_clusters?.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, new_clusters);
    const new_data = { ...this.data, key: null, clusters };
    const new_group = await this.env.cluster_groups.create_or_update(new_data);
    return new_group;
  }
  
  // GETTERS
  get clusters(){
    return this.env.clusters.get_many(Object.keys(this.data.clusters));
  }

  // BASE CLASS OVERRIDES
  get_key() {
    if(!this.data.key) this.data.key = [
      Date.now().toString(),
      ...Object.keys(this.data.clusters || {}).sort()
    ].join('-');
    return this.data.key;
  }

  init() {
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

  get settings() {
    return this.data.filters;
  }
}