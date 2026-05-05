import { compare_versions } from './compare_versions.js';
import { deep_merge_no_overwrite } from './deep_merge_no_overwrite.js';

const CONFIG_RECORD_ENV_VERSION_KEY = '__smart_env_version';

/**
 * Deep-merge `incoming` into `target` without losing data, honouring
 * version semantics
 *
 * Version handling:
 *   - `version` may be a number or a string (semver, e.g. "1.0.0").
 *   - Missing `version` is treated as 0.
 *   - When comparing semver strings and numbers that represent the same
 *     numeric value (e.g. "1" vs 1), the semver string wins.
 *   - If two config records have the same version, the SmartEnv version that
 *     introduced the existing record breaks the tie.
 *
 * Rules for `collections`:
 *   - If `target` does not have the collection -> copy it straight in.
 *   - If both have it and incoming.version is higher -> replace the whole
 *     record (newer wins) but preserve keys the new record omits.
 *   - If versions are equal and incoming's SmartEnv version is higher ->
 *     replace the whole record but preserve keys the new record omits.
 *   - If incoming is older, or the versions are equal without a higher source
 *     SmartEnv version -> additive merge (`deep_merge_no_overwrite`) without
 *     overwriting existing keys.
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
    if (key === 'version') {
      if (!Object.prototype.hasOwnProperty.call(target, 'version') || compare_versions(value, target.version) > 0) {
        target.version = value;
      }
      continue;
    }

    /* ----------------------------- Collections ----------------------------- */
    if (key === 'collections' && value && typeof value === 'object') {
      if (!target.collections) target.collections = {};

      for (const [col_key, col_def] of Object.entries(value)) {
        const existing_def = target.collections[col_key];

        // First time we meet this collection - just take it.
        if (!existing_def) {
          target.collections[col_key] = { ...col_def };
          set_config_record_env_version(target.collections[col_key], NEW_VER);
          continue;
        }

        const new_version_raw = get_config_record_version(col_def);
        const cur_version_raw = get_config_record_version(existing_def);
        const cmp = compare_config_record_versions(
          new_version_raw,
          cur_version_raw,
          NEW_VER,
          get_config_record_env_version(existing_def, CUR_VER),
        );

        if (cmp > 0) {
          // Newer definition wins but keep keys the newer record omits
          const replaced = { ...col_def };
          deep_merge_no_overwrite(replaced, existing_def);
          set_config_record_env_version(replaced, NEW_VER);
          target.collections[col_key] = replaced;
        } else {
          // Same or older version - additive merge (don't overwrite)
          deep_merge_no_overwrite(existing_def, col_def);
        }
      }
      continue; // done with this top-level key
    }

    // THIS LOGIC IS LIKELY CANONICAL
    if (['actions', 'collections', 'components', 'modules', 'items'].includes(key) && value && typeof value === 'object') {
      if (!target[key]) target[key] = {};

      for (const [comp_key, comp_def] of Object.entries(value)) {
        if (!target[key][comp_key]) {
          // if comp_def is a class then wrap in {class: comp_def} and preserve version if defined on the class itself
          if (typeof comp_def === 'function') {
            const comp_version = get_config_record_version(comp_def);
            target[key][comp_key] = {
              class: comp_def,
              ...(comp_version !== undefined ? { version: comp_version } : {})
            };
            set_config_record_env_version(target[key][comp_key], NEW_VER);
            continue;
          }
          target[key][comp_key] = { ...comp_def };
          set_config_record_env_version(target[key][comp_key], NEW_VER);
          continue;
        }

        const target_comp = target[key][comp_key];
        const incoming_ver = get_config_record_version(comp_def);
        const target_ver = get_config_record_version(target_comp);
        const cmp = compare_config_record_versions(
          incoming_ver,
          target_ver,
          NEW_VER,
          get_config_record_env_version(target_comp, CUR_VER),
        );
        // console.log(`Merging ${key} "${comp_key}": target version "${target_ver}" vs incoming "${incoming_ver}" -> cmp=${cmp}`);

        if (cmp > 0) {
          target[key][comp_key] = comp_def;
          set_config_record_version(target[key][comp_key], incoming_ver);
          set_config_record_env_version(target[key][comp_key], NEW_VER);
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
          // Same or older version - additive merge (don't overwrite)
          deep_merge_no_overwrite(target_comp, comp_def);
        }
      }
      continue; // done with this top-level key
    }

    /* ----------------------------- Default path ---------------------------- */
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

function get_config_record_version(record) {
  if (!record) return undefined;
  if (record.version !== undefined) return record.version;
  return record?.class?.version;
}

function get_config_record_env_version(record, fallback_version) {
  return record?.[CONFIG_RECORD_ENV_VERSION_KEY] ?? fallback_version;
}

function compare_config_record_versions(new_record_version, cur_record_version, new_env_version, cur_env_version) {
  const record_cmp = compare_versions(new_record_version, cur_record_version);
  if (record_cmp !== 0) return record_cmp;
  return compare_versions(new_env_version, cur_env_version);
}

function set_config_record_version(record, version) {
  if (version === undefined) return;
  if (!record || (typeof record !== 'object' && typeof record !== 'function')) return;
  record.version = version;
}

function set_config_record_env_version(record, version) {
  if (version === undefined) return;
  if (!record || (typeof record !== 'object' && typeof record !== 'function')) return;
  Object.defineProperty(record, CONFIG_RECORD_ENV_VERSION_KEY, {
    value: version,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}

