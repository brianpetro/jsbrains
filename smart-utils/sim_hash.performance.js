/**
 * @file sim_hash.performance.js
 *
 * Executes performance tests for sim_hash with random vectors.
 *
 * Usage:
 *   node sim_hash.performance.js
 */

import { sim_hash } from './sim_hash.js';

/**
 * Generates a random float array of specified length.
 * @param {number} length - Number of floats in the vector
 * @returns {number[]} - Random float array
 */
function generate_random_vector(length) {
  const vec = [];
  for (let i = 0; i < length; i++) {
    vec.push(Math.random() * 10 - 5); // random between -5 and 5
  }
  return vec;
}

function run_performance_test() {
  const TEST_SIZES = [128, 512, 1024, 4096];
  const ITERATIONS_PER_SIZE = 1000;
  const SEED = 42;

  for (let size of TEST_SIZES) {
    console.log(`\n--- Testing vector size: ${size}, with ${ITERATIONS_PER_SIZE} iterations ---`);

    // Generate one random vector for repeated hashing
    const sample_vector = generate_random_vector(size);

    const start_time = Date.now();
    let last_hash = '';
    for (let i = 0; i < ITERATIONS_PER_SIZE; i++) {
      last_hash = sim_hash(sample_vector, { seed: SEED });
    }
    const end_time = Date.now();

    const elapsed = end_time - start_time;
    console.log(`Time: ${elapsed} ms for ${ITERATIONS_PER_SIZE} calls`);
    console.log(`Last hash computed: ${last_hash}`);
  }
}

run_performance_test();
