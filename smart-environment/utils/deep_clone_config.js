/**
 * @file deep_clone_config.js
 * @description Utility to deep-clone only plain objects and arrays, while preserving
 *             references to class constructors, functions, etc.
 *             This prevents environment merges from mutating the original main config.
 */

/**
 * Check if a value is a plain object: that is, an object whose prototype is
 * either `Object.prototype` or `null`. (i.e., not a class instance)
 * @param {any} value
 * @returns {boolean}
 */
function is_plain_object(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep clone only “plain objects” and arrays. For any non-plain objects
 * (class instances, Date, Map, function, etc.), the original reference is retained.
 *
 * @param {any} input - The input to clone.
 * @returns {any} A cloned copy for plain objects/arrays, original reference for classes/functions.
 */
export function deep_clone_config(input) {
  if (Array.isArray(input)) {
    // Recursively clone array elements
    return input.map((item) => deep_clone_config(item));
  }
  if (is_plain_object(input)) {
    // Recursively clone plain-object properties
    const output = {};
    for (const [k, v] of Object.entries(input)) {
      output[k] = deep_clone_config(v);
    }
    return output;
  }
  // For classes, functions, etc., just keep the original reference
  return input;
}
