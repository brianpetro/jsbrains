import { SmartEntities } from "smart-entities";
import { SmartCluster } from "./smart_cluster.js";
import { SmartClustersDataAdapter } from "./adapters/_adapter.js";

export class SmartClusters extends SmartEntities {
  static get defaults() {
    return {
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
    this.data_adapter = new SmartClustersDataAdapter(this);
  }

  merge_defaults() {
    let current_class = this.constructor;
    while (current_class) {
      const default_val = current_class.defaults || {};
      for (let key in default_val) {
        if (typeof default_val[key] === 'object') {
          this[key] = { ...default_val[key], ...this[key] };
        } else {
          if (this[key] === undefined) this[key] = default_val[key];
        }
      }
      current_class = Object.getPrototypeOf(current_class);
    }
  }

  get item_type() { return SmartCluster; }
  get collection_key() { return 'smart_clusters'; }

  async init() {
    await super.init();
    await this.data_adapter.load_all();
  }

  /**
   * Runs k-means clustering on items (e.g. from `smart_sources`)
   * @param {Array<Object>} items - an array of items (sources/blocks) to cluster. Each should have .vec embedding.
   */
  async generate_clusters(items) {
    if (!items || !items.length) {
      console.log("No items to cluster.");
      return;
    }

    const { clusters_ct, max_iterations, centroid_type } = this.config;

    // Extract vectors and keys
    const vectors = items.map(it => it.vec).filter(v => v);
    const keys = items.map(it => it.key);

    if (!vectors.length) {
      console.log("No vectors found, cannot cluster.");
      return;
    }

    // Initialize cluster centroids by picking random items
    const initial_indices = [];
    while (initial_indices.length < clusters_ct && initial_indices.length < vectors.length) {
      const rand_idx = Math.floor(Math.random() * vectors.length);
      if (!initial_indices.includes(rand_idx)) initial_indices.push(rand_idx);
    }
    let centroids = initial_indices.map(i => vectors[i].slice());

    let assignments = new Array(vectors.length).fill(-1);
    let changed = true;
    let iteration = 0;

    while (changed && iteration < max_iterations) {
      changed = false;
      // Assign each vector to nearest centroid
      for (let i = 0; i < vectors.length; i++) {
        const vec = vectors[i];
        const nearest_c = this.nearest_centroid(vec, centroids);
        if (assignments[i] !== nearest_c) {
          assignments[i] = nearest_c;
          changed = true;
        }
      }

      // Recalculate centroids
      const new_centroids = [];
      for (let c = 0; c < clusters_ct; c++) {
        const cluster_vectors = vectors.filter((v, i) => assignments[i] === c);
        if (!cluster_vectors.length) {
          // If empty cluster, randomly reinitialize centroid
          const rand_idx = Math.floor(Math.random() * vectors.length);
          new_centroids.push(vectors[rand_idx].slice());
          continue;
        }

        if (centroid_type === 'median') {
          new_centroids.push(this.median_vector(cluster_vectors));
        } else {
          // mean centroid
          new_centroids.push(this.mean_vector(cluster_vectors));
        }
      }

      centroids = new_centroids;
      iteration++;
    }

    // Create/Update clusters
    const now = Date.now();
    // Clear old clusters?
    this.clear();

    for (let c = 0; c < clusters_ct; c++) {
      const member_indices = assignments
        .map((cl, i) => cl === c ? i : -1)
        .filter(i => i >= 0);

      const member_keys = member_indices.map(i => keys[i]);
      const cluster_data = {
        key: `cluster_${c}_${now}`,
        member_keys,
        centroid_vec: centroids[c],
        last_clustered_at: now,
        size: member_keys.length,
        config: {
          centroid_type
        }
      };
      const cluster = new SmartCluster(this.env, cluster_data);
      cluster.generate_name();
      this.set(cluster);
    }

    await this.data_adapter.save_all();
  }

  mean_vector(vectors) {
    const vec_length = vectors[0].length;
    const sum = new Array(vec_length).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < vec_length; i++) {
        sum[i] += v[i];
      }
    }
    return sum.map(val => val / vectors.length);
  }

  median_vector(vectors) {
    const vec_length = vectors[0].length;
    const median_vec = [];
    for (let i = 0; i < vec_length; i++) {
      const vals = vectors.map(v => v[i]).sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      median_vec[i] = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
    }
    return median_vec;
  }

  nearest_centroid(vec, centroids) {
    let nearest = -1;
    let best_dist = Infinity;
    for (let c = 0; c < centroids.length; c++) {
      const d = this.euclidean_distance(vec, centroids[c]);
      if (d < best_dist) {
        best_dist = d;
        nearest = c;
      }
    }
    return nearest;
  }

  euclidean_distance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  async process_cluster_queue() {
    console.log("No cluster queue logic implemented yet.");
  }

  get notices() { return this.env.smart_connections_plugin?.notices || this.env.main?.notices; }

  async process_embed_queue() {
    console.log("smart_clusters: no embed queue processing implemented.");
  }

  async render_clusters(container, opts = {}) {
    if (container) container.innerHTML = 'Loading clusters...';
    const frag = await this.env.render_component('clusters', this, opts);
    if (container) {
      container.innerHTML = '';
      container.appendChild(frag);
    }
    return frag;
  }
}
