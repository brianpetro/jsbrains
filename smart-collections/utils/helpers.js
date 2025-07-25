import { collection_instance_name_from } from "./collection_instance_name_from.js";
import { deep_merge } from "smart-utils/deep_merge.js";
export { collection_instance_name_from, deep_merge };
/**
 * Creates a unique identifier for the given data without using cryptographic methods.
 * @param {Object} data - The data object to create a UID for.
 * @returns {string} A unique identifier based on the input data.
 */
export function create_uid(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
    // remove negative sign
    if (hash < 0) hash = hash * -1;
  }
  return hash.toString() + str.length;
}

/**
 * Deeply merges two objects, giving precedence to the properties of the source object.
 * @param {Object} target - The target object to merge properties into.
 * @param {Object} source - The source object from which properties are sourced.
 * @returns {Object} The merged object.
 */
// deep_merge provided by smart-utils

/**
 * Calculates the cosine similarity between two vectors.
 * @param {Array<number>} vector1 - The first vector.
 * @param {Array<number>} vector2 - The second vector.
 * @returns {number} The cosine similarity between the two vectors.
 */
// cos_sim provided by smart-utils

// /**
//  * Maintains a collection of top items based on their similarity measure.
//  * @param {Object} _acc - The accumulator object that stores items and their minimum similarity.
//  * @param {Object} item - The new item to consider for inclusion.
//  * @param {number} [ct=10] - The count of top items to maintain.
//  */
// export function top_acc(_acc, item, ct = 10) {
//   if (_acc.items.size < ct) {
//     _acc.items.add(item);
//   } else if (item.sim > _acc.min) {
//     _acc.items.add(item);
//     _acc.items.delete(_acc.minItem);
//     _acc.minItem = Array.from(_acc.items).reduce((min, curr) => (curr.sim < min.sim ? curr : min));
//     _acc.min = _acc.minItem.sim;
//   }
// }

/**
 * Delays the execution of the next line in the code by a specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise} A promise that resolves after the specified delay.
 */
// sleep provided by smart-utils