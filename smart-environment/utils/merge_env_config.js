import { compare_versions } from './compare_versions.js';
import { deep_merge_no_overwrite } from './deep_merge_no_overwrite.js';


/**
 * Deep-merge `incoming` into `target` without losing data, honouring
 * version semantics for collections, components, and item_types.
 *
 * Version handling:
 *   - `version` may be a number or a string (semver, e.g. "1.0.0").
 *   - Missing `version` is treated as 0.
 *   - When comparing semver strings and numbers that represent the same
 *     numeric value (e.g. "1" vs 1), the semver string wins.
 *
 * Rules for `collections`:
 *   - If `target` does not have the collection → copy it straight in.
 *   - If both have it and incoming.version is higher → replace the whole
 *     record (newer wins) but preserve keys the new record omits.
 *   - If versions are equal or incoming is older → additive merge
 *     (`deep_merge_no_overwrite`) without overwriting existing keys.
 *
 * `components` and `item_types` honour the same version comparison, but a
 * newer definition simply replaces the old one.
 *
 * Arrays are concatenated. Primitive arrays are deduplicated.
 * Objects are merged via `deep_merge_no_overwrite`. Primitive keys overwrite.
 *
 * @param {object} target   The destination object (mutated in-place).
 * @param {object} incoming The source object to merge from.
 * @returns {object} The same `target` reference for chaining.
 */
export function merge_env_config (target, incoming) {
  const CUR_VER = target.version;
  const NEW_VER = incoming.version;
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

        const new_version_raw =
          (col_def && col_def.version !== undefined
            ? col_def.version
            : col_def?.class?.version);
        const cur_version_raw =
          (existing_def && existing_def.version !== undefined
            ? existing_def.version
            : existing_def?.class?.version);

        const cmp = compare_versions(new_version_raw, cur_version_raw);

        if (cmp > 0) {
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

    // THIS LOGIC IS LIKELY CANONICAL
    if (['actions', 'collections', 'components', 'item_types', 'modules'].includes(key) && value && typeof value === 'object') {
      if (!target[key]) target[key] = {};

      for (const [comp_key, comp_def] of Object.entries(value)) {
        if (!target[key][comp_key]) {
          target[key][comp_key] = {...comp_def};
          continue;
        }

        const target_comp = target[key][comp_key];
        const incoming_ver = comp_def && comp_def.version;
        const target_ver = target_comp && target_comp.version;
        const cmp = compare_versions(incoming_ver, target_ver);
        // console.log(`Merging ${key} "${comp_key}": target version "${target_ver}" vs incoming "${incoming_ver}" → cmp=${cmp}`);

        if (cmp > 0) {
          target[key][comp_key] = comp_def;
          target[key][comp_key].version = incoming_ver || -1;
          // // Newer definition wins but keep keys the newer record omits
          // const replaced = { ...comp_def };
          // deep_merge_no_overwrite(replaced, target_comp);
          // target[key][comp_key] = replaced;
        } else {
          // DO NOT MERGE IF OLDER? MOVES RESPONSIBILITY TO OVERRIDES?
          // Object.entries(comp_def).forEach(([k, v]) => {
          //   if (typeof v === 'function') return; // skip functions
          //   if(!target_comp[k]) target_comp[k] = v;
          //   else deep_merge_no_overwrite(target_comp[k], v);
          // });
          // Same or older version – additive merge (don’t overwrite)
          deep_merge_no_overwrite(target_comp, comp_def);
        }
      }
      continue; // done with this top-level key
    }

    // // DEPRECATED item_types handles (use items and config in collections instead)
    // /* ───────────────────────────── Item types ───────────────────────────── */
    // if (key === 'item_types' && value && typeof value === 'object') {
    //   if (!target.item_types) target.item_types = {};

    //   for (const [type_key, type_def] of Object.entries(value)) {
    //     if (!target.item_types[type_key]) {
    //       target.item_types[type_key] = type_def;
    //       continue;
    //     }

    //     const existing_type = target.item_types[type_key];
    //     const new_version_raw = type_def && type_def.version;
    //     const cur_version_raw = existing_type && existing_type.version;
    //     const cmp = compare_versions(new_version_raw || NEW_VER, cur_version_raw || CUR_VER);

    //     if (cmp > 0) {
    //       target.item_types[type_key] = type_def;
    //     } else {
    //       deep_merge_no_overwrite(existing_type, type_def);
    //     }
    //   }
    //   continue; // done with this top-level key
    // }

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
