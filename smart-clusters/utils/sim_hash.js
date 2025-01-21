/**
 * @file sim_hash.js
 *
 * Implements 32-bit SimHash for an array of floats, using MurmurHash3 (32-bit).
 */

import { murmur_hash_32 } from './create_hash.js';

/**
 * Generate a 32-bit SimHash for an array of floats using MurmurHash3.
 *
 * @param {number[]} vector - Array of floats (e.g., length 128, 512, 1536, etc.).
 * @param {Object} [options]
 * @param {number} [options.seed=0] - Seed for Murmur3 hash function.
 * @returns {string} - 8-char hex string representing a 32-bit hash.
 */
export function sim_hash(vector, { seed = 0 } = {}) {
  const BIT_LENGTH = 32;
  // Use a floating accumulator array with 32 elements
  const bit_acc = new Float64Array(BIT_LENGTH);

  for (let i = 0; i < vector.length; i++) {
    const weight = vector[i];
    // Use the dimension 'i' as part of the hash input
    const h = murmur_hash_32(i.toString(), seed);

    for (let b = 0; b < BIT_LENGTH; b++) {
      if ((h >>> b) & 1) {
        bit_acc[b] += weight;
      } else {
        bit_acc[b] -= weight;
      }
    }
  }

  // Convert sign of each accumulator cell to a bit
  let hash_value = 0;
  for (let b = BIT_LENGTH - 1; b >= 0; b--) {
    hash_value <<= 1;
    if (bit_acc[b] >= 0) {
      hash_value |= 1;
    }
  }

  // Return as an 8-hex-digit string
  return (hash_value >>> 0).toString(16).padStart(8, '0');
}