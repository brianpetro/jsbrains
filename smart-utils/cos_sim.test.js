/**
 * @file cos_sim.test.js
 * @description Unit tests for the cos_sim function using AVA.
 */

import test from 'ava';
import { cos_sim } from 'smart-utils/cos_sim.js';

/**
 * @description Tests whether cos_sim calculates the correct cosine similarity
 * for two identical vectors (positive integers).
 */
test('cos_sim: identical vectors, positive integers', t => {
  const vector_one = [1, 2, 3];
  const vector_two = [1, 2, 3];
  const result = cos_sim(vector_one, vector_two);
  t.is(result, 1, 'Cosine similarity of identical vectors should be 1');
});

/**
 * @description Tests whether cos_sim calculates the correct cosine similarity
 * for vectors with both positive and negative values (allows for floating-point rounding).
 */
test('cos_sim: mixed sign vectors', t => {
  const vector_one = [1, -1, 2];
  const vector_two = [2, -1, 1];

  const result = cos_sim(vector_one, vector_two);

  // Expected = 5/6 = 0.8333333333...
  const expected = 5 / 6;
  const epsilon = 1e-12;

  t.true(
    Math.abs(result - expected) < epsilon,
    `Cosine similarity of [1, -1, 2] and [2, -1, 1] should be close to ${expected} (got ${result})`
  );
});

/**
 * @description Tests whether cos_sim returns 0 when one or both vectors
 * have an extremely small magnitude (e.g. zero vector).
 */
test('cos_sim: zero vector should return 0', t => {
  const vector_one = [0, 0, 0];
  const vector_two = [1, 2, 3];
  const result = cos_sim(vector_one, vector_two);
  t.is(result, 0, 'Cosine similarity with zero vector should be 0');
});

/**
 * @description Tests that cos_sim throws an error when vectors have different lengths.
 */
test('cos_sim: throws error with different lengths', t => {
  const vector_one = [1, 2];
  const vector_two = [1, 2, 3];
  const error = t.throws(() => {
    cos_sim(vector_one, vector_two);
  });
  t.is(error.message, 'Vectors must have the same length');
});

/**
 * @description Tests for floating-point precision and correct handling.
 */
test('cos_sim: floating point precision check', t => {
  const vector_one = [0.1, 0.2, 0.3];
  const vector_two = [0.1, 0.2, 0.3];
  const result = cos_sim(vector_one, vector_two);
  // Ideally close to 1, some floating-point error is acceptable
  t.true(Math.abs(result - 1) < 1e-12, 'Cosine similarity should be very close to 1 for nearly identical vectors');
});
