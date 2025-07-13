import { deep_merge_no_overwrite } from './deep_merge_no_overwrite.js';

/**
 * Deep-merge `incoming` into `target` **without losing data**, honouring
 * version semantics for collections (and, in the future, modules).
 *
 * Rules for `collections`:
 *   • If `target` does not have the collection ⇒ copy it straight in.
 *   • If both have it and **incoming.class.version** is **higher** ⇒ replace
 *     the whole record (newer wins) but preserve keys the new record omits.
 *   • If versions are **equal** **or incoming is older** ⇒ *augment* the
 *     existing record with any keys that don’t already exist
 *     (`deep_merge_no_overwrite`). This keeps the newer class intact while
 *     merging additional props from the incoming definition.
 *
 * Arrays are concatenated. Primitive keys are overwritten.
 *
 * @param {object} target   – The destination object (mutated in-place).
 * @param {object} incoming – The source object to merge from.
 * @returns {object} The same `target` reference for chaining.
 */
export function merge_env_config (target, incoming) {
  for (const [key, value] of Object.entries(incoming)) {

    /* ───────────────────────────── Collections ───────────────────────────── */
    if (key === 'collections' && value && typeof value === 'object') {
      if (!target.collections) target.collections = {};

      for (const [col_key, col_def] of Object.entries(value)) {
        const existing_def = target.collections[col_key];

        // First time we meet this collection – just take it.
        if (!existing_def) {
          target.collections[col_key] = { ...col_def };
          continue;
        }

        const new_ver = +(col_def?.class?.version ?? 0);
        const cur_ver = +(existing_def?.class?.version ?? 0);

        if (new_ver > cur_ver) {
          // Newer definition wins but keep keys the newer record omits
          const replaced = { ...col_def };
          deep_merge_no_overwrite(replaced, existing_def);
          target.collections[col_key] = replaced;
        } else {
          // Same or older version – additive merge (don’t overwrite)
          deep_merge_no_overwrite(existing_def, col_def);
        }
      }
      continue; // done with this top-level key
    }
    /* ───────────────────────────── Components ───────────────────────────── */
    if (key === 'components' && value && typeof value === 'object') {
      if (!target.components) target.components = {};
      for (const [comp_key, comp_def] of Object.entries(value)) {
        if (!target.components[comp_key]) target.components[comp_key] = comp_def;
        else {
          const new_ver = +(comp_def?.version ?? 0);
          const cur_ver = +(target.components[comp_key]?.version ?? 0);
          if (new_ver > cur_ver) {
            target.components[comp_key] = comp_def;
          } else {
            deep_merge_no_overwrite(target.components[comp_key], comp_def);
          }
        }
      }
      continue; // done with this top-level key
    }

    /* ───────────────────────────── Default path ──────────────────────────── */
    if (Array.isArray(value)) {
      if (Array.isArray(target[key])) {
        // Merge arrays, deduplicate for primitives (string/number/boolean)
        if (
          value.length > 0 &&
          (typeof value[0] === 'string' ||
            typeof value[0] === 'number' ||
            typeof value[0] === 'boolean')
        ) {
          // Only deduplicate for primitive arrays
          target[key] = Array.from(new Set([...target[key], ...value]));
        } else {
          // For arrays of objects, just concatenate
          target[key] = [...target[key], ...value];
        }
      } else {
        // If target[key] does not exist, just assign a deduplicated array for primitives
        if (
          value.length > 0 &&
          (typeof value[0] === 'string' ||
            typeof value[0] === 'number' ||
            typeof value[0] === 'boolean')
        ) {
          target[key] = Array.from(new Set(value));
        } else {
          target[key] = [...value];
        }
      }
    } else if (value && typeof value === 'object') {
      if (!target[key]) target[key] = {};
      deep_merge_no_overwrite(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}
