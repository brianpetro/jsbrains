import { is_plain_object } from "./is_plain_object.js";

/**
 * @function deep_merge
 * @description Classic deep merge but overwriting target's keys with source if present.
 * @param {Object} target - The object to merge into.
 * @param {Object} source - The object whose properties will overwrite/merge into target.
 * @returns {Object} The mutated target object.
 */

export function deep_merge(target, source) {
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (is_plain_object(source[key]) && is_plain_object(target[key])) {
      deep_merge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
