/**
 * @fileoverview
 * An optimized version of the k-medoids (PAM-like) clustering code. 
 * The main optimization is to precompute all pairwise distances once and 
 * then reuse that distance matrix wherever distances are needed 
 * (assignment, medoid selection, silhouette, etc.). This prevents 
 * repeated distanceFn calls for the same item pairs.
 */

import { cos_sim } from 'smart-entities/utils/cos_sim.js';
import { shuffle_array } from './shuffle_array.js';

/**
 * @typedef {Object} Item
 * @property {string} key - Unique identifier
 * @property {number[]} vec - Embedding vector
 */

/**
 * @typedef {Object} ClusterConfig
 * @property {number} [clusters_ct] - If provided, use this as K directly
 * @property {number} [max_iterations] - If provided, use as the iteration limit
 * @property {boolean} [auto_optimize_k] - If true, attempt to find best K 
 *   (e.g., via silhouette or other heuristic)
 * @property {Function} [distance_fn] - A custom distance function
 * // Add any other config options needed for heuristics or advanced logic.
 */

/**
 * @typedef {Object} Cluster
 * @property {string} key - Unique cluster key
 * @property {string|null} center_source_key - Key of the item chosen as the medoid
 * @property {string[]} members - Array of source keys assigned to this cluster
 * @property {number} number_of_members - Count of assigned members
 */

/**
 * cluster_sources: Clusters the given items via a k-medoids (PAM-like) approach,
 * using a precomputed distance matrix to avoid repeated distance calculations.
 * 
 * Steps in brief:
 * 1. Determine K:
 *    - If config.clusters_ct is given, use it.
 *    - Else if config.auto_optimize_k is true, run a silhouette-based search 
 *      across a range [2..some_max] to pick the best K.
 *    - Else fallback to a default (e.g., 2 or 3).
 * 2. Determine max_iterations:
 *    - If config.max_iterations is given, use it.
 *    - Else set a default (e.g., 100).
 * 3. Build distance matrix once for all items.
 * 4. PAM-like procedure:
 *    - Randomly choose initial medoids (K distinct items).
 *    - Repeat until no improvement or we hit max_iterations:
 *       a) Assign each item to the nearest medoid
 *       b) For each cluster, find the item that minimizes total distance 
 *          to other cluster members (the new medoid).
 *    - Return final cluster assignments & medoids.
 *
 * @param {Item[]} items - Array of items to cluster
 * @param {ClusterConfig} [config={}] - Optional cluster config
 * @returns {Cluster[]} Array of clusters
 */
export function cluster_sources(items, config = {}) {
  const n = items.length;
  if (n === 0) return [];

  // 1. Determine K
  let K = config.clusters_ct;
  // 3. Choose a distance function or default to 1 - cos_sim
  const distance_fn = config.distance_fn || ((a, b) => (1 - cos_sim(a, b)));

  // Precompute the distance matrix for all items
  const dist_matrix = build_distance_matrix(items, distance_fn);

  if (!K) {
    K = calc_optimal_k(items, config, dist_matrix);
  }

  // 2. Determine max_iterations
  let max_iters = config.max_iterations || 100;

  // 4. Initialize medoids (simple random pick or advanced method)
  let medoid_indices = rand_medoid(items, K);

  // 5. Repeat the PAM steps
  let assignments;
  let iteration = 0;
  let changed = true;

  while (iteration < max_iters && changed) {
    changed = false;
    iteration++;

    // 5a. Assign each item to the closest medoid
    assignments = Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      let bestMedoidIdx = -1;
      let bestDist = Infinity;
      for (let m = 0; m < medoid_indices.length; m++) {
        const dist = dist_matrix[i][medoid_indices[m]];
        if (dist < bestDist) {
          bestDist = dist;
          bestMedoidIdx = m;
        }
      }
      assignments[i] = bestMedoidIdx;
    }

    // 5b. For each cluster, find a new medoid if it reduces total distance
    for (let clusterId = 0; clusterId < K; clusterId++) {
      const clusterItems = [];
      for (let i = 0; i < n; i++) {
        if (assignments[i] === clusterId) {
          clusterItems.push(i);
        }
      }
      if (clusterItems.length === 0) continue; // no members => skip

      // compute best medoid among clusterItems
      let bestCandidateIdx = medoid_indices[clusterId];
      let bestSumDist = sum_dist(clusterItems, bestCandidateIdx, dist_matrix);

      for (const idx of clusterItems) {
        const candidateSumDist = sum_dist(clusterItems, idx, dist_matrix);
        if (candidateSumDist < bestSumDist) {
          bestSumDist = candidateSumDist;
          bestCandidateIdx = idx;
        }
      }

      // Check if medoid changed
      if (bestCandidateIdx !== medoid_indices[clusterId]) {
        medoid_indices[clusterId] = bestCandidateIdx;
        changed = true;
      }
    }
  }

  // 6. Construct final cluster output
  const clusters = [];
  for (let clusterId = 0; clusterId < K; clusterId++) {
    const clusterItems = [];
    for (let i = 0; i < n; i++) {
      if (assignments[i] === clusterId) {
        clusterItems.push(items[i].key);
      }
    }
    clusters.push({
      key: `cluster_${clusterId}`,
      center_source_key: items[medoid_indices[clusterId]]?.key || null,
      members: clusterItems,
      number_of_members: clusterItems.length
    });
  }

  return clusters;
}

/**
 * If user wants to auto-optimize K (and didn't specify clusters_ct),
 * we try a small silhouette-based search:
 *  - We pick K from 2..some max (e.g. min(10, n)), or up to n if small.
 *  - For each K, run a short k-medoids procedure to get assignments.
 *  - Compute the average silhouette. Choose the best K.
 * 
 * @param {Item[]} items 
 * @param {ClusterConfig} config 
 * @param {number[][]} dist_matrix Precomputed distance matrix
 * @returns {number} The chosen optimal K
 */
function calc_optimal_k(items, config, dist_matrix) {
  const n = items.length;
  if (n < 20) {
    return Math.max(2, Math.floor(n / 2));
  }
  if (n <= 100) {
    // trivial
    return 20; // If there's 1 or 2 items, just cluster them into n clusters
  }

  const max_k = Math.floor(n / 50);
  let best_k = 25;
  let best_silhouette = -Infinity;

  for (let k = 25; k <= max_k; k++) {
    // Do a short k-medoids run (fewer iterations to save time)
    const { assignments, medoids } = pam_once(items, k, dist_matrix, /*maxIters=*/10);
    // Compute silhouette
    const silhouette_score = compute_silhouette(items, assignments, k, dist_matrix);
    if (silhouette_score > best_silhouette) {
      best_k = k;
      best_silhouette = silhouette_score;
    }
  }

  return best_k;
}

/**
 * A quick PAM run (k-medoids) that returns just the final
 * assignments and medoids. We can run a smaller maxIters 
 * for speed (like 10) just to get approximate clusters.
 * 
 * @param {Item[]} items
 * @param {number} K
 * @param {number[][]} dist_matrix
 * @param {number} [maxIters=10]
 * @returns {{assignments: number[], medoids: number[]}}
 */
function pam_once(items, K, dist_matrix, maxIters = 10) {
  const n = items.length;
  let medoid_indices = rand_medoid(items, K);
  let assignments = new Array(n).fill(-1);

  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false;

    // Assign step
    for (let i = 0; i < n; i++) {
      let bestDist = Infinity;
      let bestMedoidIdx = -1;
      for (let m = 0; m < medoid_indices.length; m++) {
        const dist = dist_matrix[i][medoid_indices[m]];
        if (dist < bestDist) {
          bestDist = dist;
          bestMedoidIdx = m;
        }
      }
      assignments[i] = bestMedoidIdx;
    }

    // Update step
    for (let clusterId = 0; clusterId < K; clusterId++) {
      const clusterItems = [];
      for (let i = 0; i < n; i++) {
        if (assignments[i] === clusterId) clusterItems.push(i);
      }
      if (!clusterItems.length) continue;

      let bestCandidateIdx = medoid_indices[clusterId];
      let bestSumDist = sum_dist(clusterItems, bestCandidateIdx, dist_matrix);

      for (const idx of clusterItems) {
        const candidateSumDist = sum_dist(clusterItems, idx, dist_matrix);
        if (candidateSumDist < bestSumDist) {
          bestSumDist = candidateSumDist;
          bestCandidateIdx = idx;
        }
      }
      if (bestCandidateIdx !== medoid_indices[clusterId]) {
        medoid_indices[clusterId] = bestCandidateIdx;
        changed = true;
      }
    }

    if (!changed) break;
  }

  return { assignments, medoids: medoid_indices };
}

/**
 * Compute the average silhouette score for the given clustering assignment.
 * Silhouette for item i is defined as:
 * 
 *   a(i) = avg distance of i to all other items in the same cluster
 *   b(i) = min over k != cluster(i) of [avg distance of i to items in cluster k]
 *   s(i) = (b(i) - a(i)) / max(a(i), b(i))
 * 
 * We then average s(i) over all i.
 * 
 * @param {Item[]} items
 * @param {number[]} assignments  array of length n with cluster IDs
 * @param {number} K
 * @param {number[][]} dist_matrix
 * @returns {number} average silhouette (in [-1,1])
 */
function compute_silhouette(items, assignments, K, dist_matrix) {
  const n = items.length;
  // Group indices by cluster
  const clusters = [];
  for (let k = 0; k < K; k++) {
    clusters.push([]);
  }
  for (let i = 0; i < n; i++) {
    clusters[assignments[i]].push(i);
  }

  let totalSilhouette = 0;
  for (let i = 0; i < n; i++) {
    const clusterId = assignments[i];
    const sameCluster = clusters[clusterId];
    if (sameCluster.length <= 1) {
      // if item is alone in its cluster, silhouette is 0 by convention
      totalSilhouette += 0;
      continue;
    }

    // a(i): average distance to items in the same cluster
    const a_i = average_dist_to_group(i, sameCluster, dist_matrix);

    // b(i): find minimum average distance to any other cluster
    let b_i = Infinity;
    for (let k = 0; k < K; k++) {
      if (k === clusterId || clusters[k].length === 0) continue;
      const distToK = average_dist_to_group(i, clusters[k], dist_matrix);
      if (distToK < b_i) {
        b_i = distToK;
      }
    }

    // silhouette
    const s_i = (b_i - a_i) / Math.max(a_i, b_i);
    totalSilhouette += s_i;
  }

  return totalSilhouette / n;
}

/**
 * Helper: builds a full NxN distance matrix for the items, using the provided 
 * distance function. dist_matrix[i][j] = distance between items[i] and items[j].
 * 
 * @param {Item[]} items
 * @param {Function} distance_fn
 * @returns {number[][]} NxN distance matrix
 */
function build_distance_matrix(items, distance_fn) {
  const n = items.length;
  const dist_matrix = new Array(n);
  for (let i = 0; i < n; i++) {
    dist_matrix[i] = new Array(n).fill(0);
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distVal = distance_fn(items[i].vec, items[j].vec);
      dist_matrix[i][j] = distVal;
      dist_matrix[j][i] = distVal;
    }
  }
  return dist_matrix;
}

/** 
 * Helper: compute the average distance from item i to items in group (index array).
 * Excludes i itself from the average if present. 
 * 
 * @param {number} i
 * @param {number[]} groupIndices
 * @param {number[][]} dist_matrix
 * @returns {number}
 */
function average_dist_to_group(i, groupIndices, dist_matrix) {
  let sum = 0;
  let count = 0;
  for (const idx of groupIndices) {
    if (idx === i) continue;
    sum += dist_matrix[i][idx];
    count++;
  }
  return (count > 0) ? sum / count : 0;
}

/** 
 * Helper to pick random medoids (K distinct indices) 
 * 
 * @param {Item[]} items
 * @param {number} K
 * @returns {number[]} array of chosen medoid indices
 */
function rand_medoid(items, K) {
  const indices = [...Array(items.length).keys()];
  shuffle_array(indices);
  return indices.slice(0, K);
}

/** 
 * Helper to compute total distance from candidate to the cluster items 
 * 
 * @param {number[]} clusterIndices 
 * @param {number} candidateIdx 
 * @param {number[][]} dist_matrix 
 * @returns {number}
 */
function sum_dist(clusterIndices, candidateIdx, dist_matrix) {
  let sumDist = 0;
  for (const idx of clusterIndices) {
    sumDist += dist_matrix[idx][candidateIdx];
  }
  return sumDist;
}
