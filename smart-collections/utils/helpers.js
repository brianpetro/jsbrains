import { collection_instance_name_from } from "./collection_instance_name_from.js";
export { collection_instance_name_from };
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
export function deep_merge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      // both exist and are objects
      if (is_obj(source[key]) && is_obj(target[key])) deep_merge(target[key], source[key]);
      else target[key] = source[key]; // precedence to source
    }
  }
  return target;
  function is_obj(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
}

/**
 * Calculates the cosine similarity between two vectors.
 * @param {Array<number>} vector1 - The first vector.
 * @param {Array<number>} vector2 - The second vector.
 * @returns {number} The cosine similarity between the two vectors.
 */
export function cos_sim(vector1, vector2) {
  const dotProduct = vector1.reduce((acc, val, i) => acc + val * vector2[i], 0);
  const normA = Math.sqrt(vector1.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vector2.reduce((acc, val) => acc + val * val, 0));
  return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
}

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
export function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }