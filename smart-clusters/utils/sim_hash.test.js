/**
 * @file sim_hash.test.js
 *
 * Basic correctness tests for sim_hash.js using ava.
 *
 * Usage:
 *   1. npm install --save-dev ava
 *   2. npx ava sim_hash.test.js
 */

import test from 'ava';
import { sim_hash } from './sim_hash.js';

/**
 * Basic consistency check:
 *   The same input vectors with same seed should produce same hash.
 */
test('sim_hash: same input => same hash', t => {
  const input_vec = [0.1, 0.2, 0.3, 0.4];
  const hash_a = sim_hash(input_vec, { seed: 123 });
  const hash_b = sim_hash(input_vec, { seed: 123 });
  t.is(hash_a, hash_b);
});

/**
 * Changing seed typically changes hash output (though collisions are possible).
 */
test('sim_hash: different seeds => different hash (usually)', t => {
  const input_vec = [0.1, 0.2, 0.3, 0.4];
  const hash_a = sim_hash(input_vec, { seed: 0 });
  const hash_b = sim_hash(input_vec, { seed: 999 });
  t.not(hash_a, hash_b);
});

/**
 * Changing vector content changes the hash.
 */
test('sim_hash: different vectors => different hash (usually)', t => {
  const input_vec_1 = [1.0, 2.0, 3.0];
  const input_vec_2 = [1.0, 2.1, 3.0];
  const hash_1 = sim_hash(input_vec_1, { seed: 0 });
  const hash_2 = sim_hash(input_vec_2, { seed: 0 });
  t.not(hash_1, hash_2);
});

/**
 * Larger vector demonstration:
 *   Usually stable for repeated calls with same data & seed.
 */
test('sim_hash: large vectors stable output', t => {
  const large_vec = [];
  for (let i = 0; i < 512; i++) {
    large_vec.push(Math.random());
  }
  const hash_a = sim_hash(large_vec, { seed: 123 });
  const hash_b = sim_hash(large_vec, { seed: 123 });
  t.is(hash_a, hash_b);
});
