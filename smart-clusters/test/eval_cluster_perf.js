/**
 * @file eval_cluster_distribution.js
 * @description
 * Script for evaluating the *distribution* of clusters produced by `cluster_sources`,
 * with performance timing as a secondary metric.
 *
 * The clustering function accepts:
 *   1) An array `sources` of objects: Each object must have:
 *       - `key` (string identifier)
 *       - `vec` (array of numbers representing its vector)
 *   2) A `params` object specifying clustering parameters, e.g. `{ clusters_ct: <number>, ... }`.
 *
 * Usage:
 *   1) Replace `cluster_sources` import if needed (or copy it in if needed).
 *   2) Adjust `TEST_CONFIGS` and `RUNS_PER_CONFIG` as necessary.
 *   3) Run this script to observe cluster distribution stats
 *      (avg size, median size, std dev, etc.) along with timing.
 */

import { cluster_sources } from '../utils/cluster_sources.js';

/**
 * Generate random test data for clustering, with a specified number of
 * simulated clusters. Each cluster has its own random "mean" embedding
 * vector. Individual items then add random noise around their cluster's mean.
 *
 * @param {number} data_count - Number of data points to generate
 * @param {number} vec_length - Dimensionality of each `vec` array
 * @param {number} cluster_count - Number of simulated clusters
 * @returns {Array<{key:string, vec:Array<number>, cluster_id:number}>}
 */
export function generate_random_sources(data_count, vec_length, cluster_count = 500) {
  // Create random cluster means
  // Each cluster_mean is an array of length `vec_length`, filled with [0..1] randoms.
  const cluster_means = [];
  for (let c = 0; c < cluster_count; c++) {
    const mean_vec = [];
    for (let d = 0; d < vec_length; d++) {
      mean_vec.push(Math.random()); // cluster mean dimension
    }
    cluster_means.push(mean_vec);
  }

  // Generate items, each belonging to one of the clusters
  const sources = [];
  for (let i = 0; i < data_count; i++) {
    // Pick a random cluster for this item
    const cluster_id = Math.floor(Math.random() * cluster_count);

    // Build the item vector near that cluster's mean,
    // by adding noise in the range [-0.05..0.05] or similar
    const vec = [];
    for (let j = 0; j < vec_length; j++) {
      const mean_val = cluster_means[cluster_id][j];
      const noise = (Math.random() - 0.5) * 0.1; // tweak 0.1 for more/less overlap
      vec.push(mean_val + noise);
    }

    sources.push({
      key: `item_${i}_${cluster_id}`,
      vec,
    });
  }
  return sources;
}

/**
 * Calculate average of an array of numbers.
 *
 * @param {number[]} arr
 * @returns {number}
 */
function calc_avg(arr) {
  if (!arr.length) return 0;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return sum / arr.length;
}

/**
 * Calculate standard deviation of an array of numbers.
 *
 * @param {number[]} arr
 * @returns {number}
 */
function calc_stdev(arr) {
  if (arr.length < 2) return 0;
  const mean = calc_avg(arr);
  const variance =
    arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculate the median of an array of numbers.
 *
 * @param {number[]} arr
 * @returns {number}
 */
function calc_median(arr) {
  if (!arr.length) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Capture distribution statistics for the resulting clusters.
 *  1) total_cluster_count = how many clusters appear
 *  2) size_std_dev = standard deviation across cluster sizes
 *  3) average_cluster_size = average across cluster sizes
 *  4) median_cluster_size = median across cluster sizes
 *
 * @param {Array<{
 *    key:string,
 *    center_source_key:string|null,
 *    members:string[],
 *    number_of_members:number,
 *    iteration_min_sim:number|null
 * }>} clusters
 * @returns {{
 *   total_cluster_count: number,
 *   size_std_dev: number,
 *   average_cluster_size: number,
 *   median_cluster_size: number,
 *   cluster_sizes: number[] // kept for internal use; not logged individually
 * }}
 */
function measure_distribution(clusters) {
  let cluster_sizes = [];

  for (const c of clusters) {
    cluster_sizes.push(c.number_of_members);
  }

  const total_cluster_count = cluster_sizes.length;
  const size_std_dev = calc_stdev(cluster_sizes);
  const average_cluster_size = calc_avg(cluster_sizes);
  const median_cluster_size = calc_median(cluster_sizes);

  return {
    total_cluster_count,
    size_std_dev,
    average_cluster_size,
    median_cluster_size,
    // Keep raw sizes for reference if needed, but we won't log them all:
    cluster_sizes,
  };
}

/**
 * Time a single clustering run in milliseconds.
 *
 * @param {Array<{key:string,vec:Array<number>}>} sources
 * @param {{clusters_ct:number}} params
 * @returns {{duration_ms:number,clusters:Array}}
 */
function time_clustering_run(sources, params) {
  const start = Date.now();
  const clusters = cluster_sources(sources, params);
  const end = Date.now();
  return {
    duration_ms: end - start,
    clusters,
  };
}

/**
 * Perform repeated runs of the clustering function and gather distribution + performance stats.
 *
 * @param {number} runs - How many times to invoke the clustering function
 * @param {Array<{key:string,vec:Array<number>}>} sources
 * @param {{clusters_ct:number, [key:string]:any}} params
 * @returns {{
 *   average_time: number,
 *   min_time: number,
 *   max_time: number,
 *   std_dev_time: number,
 *   distribution_stats: {
 *     total_cluster_count: number[],
 *     size_std_dev: number[],
 *     average_cluster_size: number[],
 *     median_cluster_size: number[],
 *   }
 * }}
 */
function measure_distribution_performance(runs, sources, params) {
  const durations = [];
  // We collect distribution stats from each run to show average / spread of distribution.
  const all_total_cluster_counts = [];
  const all_size_std_devs = [];
  const all_avg_cluster_sizes = [];
  const all_median_cluster_sizes = [];

  for (let i = 0; i < runs; i++) {
    const { duration_ms, clusters } = time_clustering_run(sources, params);
    durations.push(duration_ms);

    const dist = measure_distribution(clusters);
    all_total_cluster_counts.push(dist.total_cluster_count);
    all_size_std_devs.push(dist.size_std_dev);
    all_avg_cluster_sizes.push(dist.average_cluster_size);
    all_median_cluster_sizes.push(dist.median_cluster_size);
  }

  return {
    average_time: calc_avg(durations),
    min_time: Math.min(...durations),
    max_time: Math.max(...durations),
    std_dev_time: calc_stdev(durations),
    distribution_stats: {
      total_cluster_count: all_total_cluster_counts,
      size_std_dev: all_size_std_devs,
      average_cluster_size: all_avg_cluster_sizes,
      median_cluster_size: all_median_cluster_sizes,
    },
  };
}

/**
 * Main function to evaluate cluster distribution with performance as a secondary metric.
 * Logging is updated to focus on more concise and useful metrics:
 * - Average & Median cluster sizes
 * - Standard Deviation
 */
function evaluate_cluster_distribution() {
  const TEST_CONFIGS = [
    // { data_count: 1000,  vec_length: 512,  clusters_ct: 10 },
    // { data_count: 1000, vec_length: 1536, clusters_ct: 10 },
    // { data_count: 1000, vec_length: 3072, clusters_ct: 10 },
    // { data_count: 2000, vec_length: 512, clusters_ct: 20 },
    // { data_count: 2000, vec_length: 512, clusters_ct: 200 },
    { data_count: 1000,  vec_length: 512 },
    { data_count: 1000, vec_length: 1536 },
    { data_count: 1000, vec_length: 3072 },
    { data_count: 2000, vec_length: 512 },
    { data_count: 2000, vec_length: 512 },
  ];

  // Runs per scenario
  const RUNS_PER_CONFIG = 3;

  console.log('=== Cluster Distribution Evaluation ===\n');

  TEST_CONFIGS.forEach((cfg, idx) => {
    const { data_count, vec_length, clusters_ct } = cfg;

    // Generate the random sources
    const sources = generate_random_sources(data_count, vec_length);

    // Prepare the clustering configuration
    const params = {
      clusters_ct,
      // max_iterations: 10,
      // max_cluster_size_percent: 0.3,
    };

    // Collect distribution/performance stats
    const {
      average_time,
      min_time,
      max_time,
      std_dev_time,
      distribution_stats,
    } = measure_distribution_performance(RUNS_PER_CONFIG, sources, params);

    // "Optimal" / reference values for demonstration:
    const ideal_cluster_size = clusters_ct ? (data_count / clusters_ct) : 'N/A';
    const ideal_std_dev = 0;

    console.log(`Scenario #${idx + 1}: data_count=${data_count}, vec_length=${vec_length}, clusters_ct=${clusters_ct}`);
    console.log(`  Performance (over ${RUNS_PER_CONFIG} runs):`);
    console.log(`    Average time: ${average_time.toFixed(2)} ms`);
    console.log(`    Min time:     ${min_time.toFixed(2)} ms`);
    console.log(`    Max time:     ${max_time.toFixed(2)} ms`);
    console.log(`    StdDev time:  ${std_dev_time.toFixed(2)} ms\n`);

    console.log(`  [Example Optimal Values]`);
    console.log(`    Ideal cluster size: ~${ideal_cluster_size}`);
    console.log(`    Ideal cluster size std dev:      ${ideal_std_dev}\n`);

    console.log(`  Actual distribution stats (each run):`);
    for (let r = 0; r < RUNS_PER_CONFIG; r++) {
      const cluster_count = distribution_stats.total_cluster_count[r];
      const size_std = distribution_stats.size_std_dev[r];
      const avg_size = distribution_stats.average_cluster_size[r];
      const med_size = distribution_stats.median_cluster_size[r];

      console.log(`    Run #${r + 1}:`);
      console.log(`      Total clusters:       ${cluster_count}`);
      console.log(`      Avg cluster size:     ${avg_size.toFixed(2)}`);
      console.log(`      Median cluster size:  ${med_size.toFixed(2)}`);
      console.log(`      Size std dev:         ${size_std.toFixed(4)}`);
    }
    console.log('--------------------------------------------------------------\n');
  });
}

// Execute
evaluate_cluster_distribution();