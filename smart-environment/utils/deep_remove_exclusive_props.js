import { any_source_has_key } from "./any_source_has_key.js";
import { is_plain_object } from "./is_plain_object.js";

/**
 * @function deep_remove_exclusive_props
 * @description Recursively removes from `target` any property that:
 *  - Exists in `removeSource`, and
 *  - Does NOT exist in any of the `keepSources`
 *
 *  Skips classes, functions, arrays. Uses a visited set to avoid cyclical references.
 *
 * @param {Object} target     - The main environment opts object.
 * @param {Object} removeSource  - The config object from the main being removed.
 * @param {Object[]} keepSources - The config objects of the remaining mains.
 * @param {WeakSet} [visited]    - Internal set to avoid cyclical references.
 */
export function deep_remove_exclusive_props(
  target,
  removeSource,
  keepSources,
  visited = new WeakSet()) {
  if (!is_plain_object(target) || !is_plain_object(removeSource)) return;
  if (visited.has(target) || visited.has(removeSource)) return;

  visited.add(target);
  visited.add(removeSource);

  for (const key of Object.keys(removeSource)) {
    const val_to_remove = removeSource[key];

    // Skip iteration for arrays, functions, classes, etc.
    if (!is_plain_object(val_to_remove)) {
      // If no keep source has the key, remove it from target.
      if (!any_source_has_key(keepSources, key)) {
        delete target[key];
      }
      continue;
    }

    // If the keep sources do not have this key at all, remove entire branch
    if (!any_source_has_key(keepSources, key)) {
      delete target[key];
      continue;
    }

    // Key does exist in at least one keep source. Recurse if both sides are plain objects.
    const target_sub = target[key];
    if (is_plain_object(target_sub)) {
      // Gather all sub-objects from keep sources
      const relevant_keeps = keepSources
        .map((src) => (is_plain_object(src[key]) ? src[key] : null))
        .filter(Boolean);

      deep_remove_exclusive_props(target_sub, val_to_remove, relevant_keeps, visited);
    }
  }
}
