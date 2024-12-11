import { SmartEntities } from "smart-entities";
import { SmartCluster } from "./smart_cluster.js";

/**
 * @class SmartClusters
 *
 * Manages a collection of SmartCluster entities. Provides:
 * - Initialization & configuration for clustering
 * - Methods to run clustering algorithms (k-means, hierarchical, etc.)
 * - Interface with embedding model to retrieve vectors
 * - Queue operations: `process_cluster_queue`, `generate_clusters`
 *
 * WDLL from notes:
 * - "Delete" cluster reassigns members
 * - Future: Many clusters
 * - MVP: few clusters
 * - base may use item key embeddings only
 * - expand to handle block embeddings
 */
export class SmartClusters extends SmartEntities {
  static get defaults() {
    return {
      // Potential defaults
      config: {
        clusters_ct: 5,
        max_iterations: 10,
        centroid_type: 'mean', // 'mean' or 'median'
      },
    };
  }

  constructor(env, opts = {}) {
    super(env, opts);
    this.merge_defaults();
  }

  merge_defaults() {
    let current_class = this.constructor;
    while (current_class) {
      for (let key in current_class.defaults) {
        const default_val = current_class.defaults[key];
        if (typeof default_val === 'object') {
          this[key] = { ...default_val, ...this[key] };
        } else {
          if (this[key] === undefined) this[key] = default_val;
        }
      }
      current_class = Object.getPrototypeOf(current_class);
    }
  }

  get item_type() { return SmartCluster; }
  get collection_key() { return 'smart_clusters'; }

  // Initialize clusters
  async init() {
    await super.init();
    // Load existing clusters
    // Possibly run initial clustering if none exist.
  }

  /**
   * Generate clusters from items (e.g., sources, blocks).
   * This is a placeholder for the clustering logic.
   */
  async generate_clusters(items) {
    // TODO: Implement clustering logic, e.g. k-means
    // Steps:
    // 1. Extract vectors from items
    // 2. Initialize cluster centroids
    // 3. Assign items to clusters, iterate until convergence or max_iterations
    // 4. Save resulting clusters
  }

  /**
   * Processes cluster queue - e.g., items that need reassigning.
   */
  async process_cluster_queue() {
    // TODO: implement logic to handle reassigning items that lost their cluster or new items that need clustering
  }

  // Rendering clusters with components
  async render_clusters(container, opts = {}) {
    if(container) container.innerHTML = 'Loading clusters...';
    const frag = await this.env.render_component('clusters', this, opts);
    if(container) {
      container.innerHTML = '';
      container.appendChild(frag);
    }
    return frag;
  }

  get notices() { return this.env.smart_connections_plugin?.notices || this.env.main?.notices; }

  // For now, no embedding model specifically for clusters; rely on items' embeddings.
  get embed_model() { return this.env.smart_sources?.embed_model || null; }
  
  async process_embed_queue() {
    // Possibly unnecessary for clusters if they don't have their own embeddings.
    // Or run centroid recalculation if cluster member embeddings changed.
    console.log("smart_clusters: no embed queue to process yet");
  }
}