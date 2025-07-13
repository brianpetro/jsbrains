import { is_plain_object } from './is_plain_object.js';

/**
 * @function deep_merge_no_overwrite
 * @description Deeply merges `source` into `target` but only if `target` does not have that key.
 *
 * - Uses a `path` array to detect cyclical references in the current recursion branch.
 *   If `sourceObject` is already in `path`, skip merging it.
 * - Each property gets its own recursion branch (`[...path]`), allowing the same
 *   source object to be merged under multiple properties (e.g. `alpha`, `beta`).
 * - If both `target[key]` and `source[key]` are arrays, their contents are concatenated.
 *
 * @param {Object} target - The object to merge into.
 * @param {Object} source - The source object to merge onto target.
 * @param {Object[]} [path=[]] - Array of source objects seen in this recursion branch.
 * @returns {Object} Mutated `target`.
 */
export function deep_merge_no_overwrite(target, source, path = []) {
  if (!is_plain_object(target) || !is_plain_object(source)) {
    return target;
  }

  // If this source object is already in path, we've hit a cycle; skip.
  if (path.includes(source)) {
    return target;
  }

  path.push(source);

  for (const key of Object.keys(source)) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    const val = source[key];

    // Merge arrays by concatenation, but prevent duplicate functions by name
    if (Array.isArray(target[key]) && Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'function') {
          const item_name = item.name;
          const has_same_fn = target[key].some(
            (el) => typeof el === 'function' && el.name === item_name
          );
          if (!has_same_fn) {
            target[key].push(item);
          }
        } else if (
          item === null ||
          ['string', 'number', 'boolean', 'undefined'].includes(typeof item)
        ) {
          // Prevent duplicate primitives
          if (!target[key].includes(item)) {
            target[key].push(item);
          }
        } else {
          target[key].push(item);
        }
      }
    }
    else if (is_plain_object(val)) {
      if (!is_plain_object(target[key])) {
        target[key] = {};
      }
      deep_merge_no_overwrite(target[key], val, [...path]);
    }
    // Only set if target doesn't already have this key
    else if (!Object.prototype.hasOwnProperty.call(target, key)) {
      target[key] = val;
    }
  }

  return target;
}
