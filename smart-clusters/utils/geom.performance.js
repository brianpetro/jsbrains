/**
 * Performance experiment for compute_centroid and compute_medoid.
 *
 * To run (in Node):
 *   1. node geom.performance.js
 *
 * Adjust the TEST_SIZES and DIMENSIONS arrays as needed.
 */

import { compute_centroid, compute_medoid } from './geom.js';

/**
 * Creates an array of random N-dimensional points.
 * @param {number} count - Number of points
 * @param {number} dimensions - Number of dimensions
 * @returns {number[][]} - Array of points
 */
function generate_random_points(count, dimensions) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const point = [];
    for (let j = 0; j < dimensions; j++) {
      point.push(Math.random() * 100);
    }
    points.push(point);
  }
  return points;
}

/**
 * Runs performance tests for various array sizes and dimensions.
 */
function run_experiment() {
  const TEST_SIZES = [100, 1000, 5000];
  const DIMENSIONS = [384, 768, 1536, 3072];

  for (let dim of DIMENSIONS) {
    console.log(`\n=== Testing with dimension = ${dim} ===`);
    for (let size of TEST_SIZES) {
      console.log(`\nGenerating ${size} points in ${dim}D...`);
      const points = generate_random_points(size, dim);

      // Test centroid
      const mem_before_centroid = process.memoryUsage().heapUsed;
      const start_centroid = Date.now();
      const centroid = compute_centroid(points);
      const end_centroid = Date.now();
      const mem_after_centroid = process.memoryUsage().heapUsed;

      const time_centroid = end_centroid - start_centroid;
      const used_mb_centroid = ((mem_after_centroid - mem_before_centroid) / 1024 / 1024).toFixed(2);
      // Show up to first 5 coordinates in logs
      const centroid_slice = centroid.slice(0, 5);

      console.log(`Size = ${size}, compute_centroid time = ${time_centroid} ms, ` +
        `Memory used ~${used_mb_centroid} MB`);
      console.log(`Centroid (first 5 coords) = [${centroid_slice.join(', ')}] ...`);

      // Test medoid
      const mem_before_medoid = process.memoryUsage().heapUsed;
      const start_medoid = Date.now();
      const medoid = compute_medoid(points);
      const end_medoid = Date.now();
      const mem_after_medoid = process.memoryUsage().heapUsed;

      const time_medoid = end_medoid - start_medoid;
      const used_mb_medoid = ((mem_after_medoid - mem_before_medoid) / 1024 / 1024).toFixed(2);
      // Show up to first 5 coordinates in logs
      const medoid_slice = medoid.slice(0, 5);

      console.log(`Size = ${size}, compute_medoid time = ${time_medoid} ms, ` +
        `Memory used ~${used_mb_medoid} MB`);
      console.log(`Medoid (first 5 coords) = [${medoid_slice.join(', ')}] ...`);
    }
  }
}

run_experiment();
