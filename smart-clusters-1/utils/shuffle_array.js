/**
 * @file shuffle_array.js
 * @description Provides a function to shuffle an array in-place using the Fisher-Yates (Knuth) algorithm.
 */

/**
 * Shuffles an array in-place using the Fisher-Yates (Knuth) algorithm.
 *
 * @param {any[]} arr - The array to shuffle.
 * @returns {any[]} The same array, shuffled in-place.
 */
export function shuffle_array(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const swap_index = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[swap_index];
    arr[swap_index] = temp;
  }
  return arr;
}