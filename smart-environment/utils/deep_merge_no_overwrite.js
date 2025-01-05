import { is_plain_object } from './is_plain_object.js';

/**
 * @function deep_merge_no_overwrite
 * @description Deeply merges `source` into `target` but only if `target` does not have that key.
 * 
 *  - Uses a `path` array to detect cyclical references in the current recursion branch.
 *    If `sourceObject` is already in `path`, skip merging it.
 *  - Each property gets its own recursion branch (`[...path]`), allowing the same
 *    source object to be merged under multiple properties (e.g. `alpha`, `beta`).
 *
 * @param {Object} target - The object to merge into.
 * @param {Object} source - The source object to merge onto target.
 * @param {Object[]} [path=[]] - Array of source objects seen in this recursion branch.
 * @returns {Object} Mutated `target`.
 */
export function deep_merge_no_overwrite(target, source, path = []) {
  // If either isn't a plain object, do nothing
  if (!is_plain_object(target) || !is_plain_object(source)) {
    return target;
  }

  // If this source object is already in path, we've hit a cycle; skip
  if (path.includes(source)) {
    return target;
  }

  // Mark this source object as visited in this branch
  path.push(source);

  // Merge keys without overwriting
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

    if (is_plain_object(val)) {
      // Ensure target[key] is a plain object
      if (!is_plain_object(target[key])) {
        target[key] = {};
      }
      // Recurse with a fresh path array so sibling merges won't block each other
      deep_merge_no_overwrite(target[key], val, [...path]);
    } else if (!Object.prototype.hasOwnProperty.call(target, key)) {
      // Set only if target doesn't have it
      target[key] = val;
    }
  }

  return target;
}
