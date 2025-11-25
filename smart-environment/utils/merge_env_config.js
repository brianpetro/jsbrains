import { deep_merge_no_overwrite } from './deep_merge_no_overwrite.js';

/**
 * Normalise a raw version value into a comparable representation.
 *
 * Rules:
 * - `null`/`undefined` → type "none", parts [0]
 * - number → type "number", parts [number]
 * - string → type "semver", parts from "x.y.z" (non-numeric segments treated as 0)
 *
 * @param {string|number|null|undefined} value
 * @returns {{ type: 'none'|'number'|'semver', parts: number[] }}
 */
function normalize_version_value (value) {
  if (value === null || value === undefined) {
    return { type: 'none', parts: [0] };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { type: 'none', parts: [0] };
    }
    return { type: 'number', parts: [value] };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return { type: 'none', parts: [0] };
    }

    const raw_parts = trimmed.split('.');
    const parts = raw_parts.map(part => {
      const match = part.match(/^\d+/);
      if (!match) return 0;
      const num = Number.parseInt(match[0], 10);
      return Number.isNaN(num) ? 0 : num;
    });

    // Trim trailing zeros but keep at least one segment
    let last_non_zero = parts.length - 1;
    while (last_non_zero > 0 && parts[last_non_zero] === 0) {
      last_non_zero -= 1;
    }
    const normalized_parts = parts.slice(0, last_non_zero + 1);
    return {
      type: 'semver',
      parts: normalized_parts.length ? normalized_parts : [0]
    };
  }

  // Any other type is treated as "no version"
  return { type: 'none', parts: [0] };
}

/**
 * Compare two version values.
 *
 * - Accepts numbers, strings (semver), or null/undefined.
 * - Missing is treated as 0.
 * - Strings are parsed as semver: major.minor.patch[…].
 * - Numbers are treated as [number] (major only).
 * - If numeric value is the same (e.g. "1" vs 1), semver string wins.
 *
 * @param {string|number|null|undefined} new_value
 * @param {string|number|null|undefined} cur_value
 * @returns {number} 1 if new_value > cur_value, -1 if new_value < cur_value, 0 if equal
 */
function compare_versions (new_value, cur_value) {
  const a = normalize_version_value(new_value);
  const b = normalize_version_value(cur_value);

  const len = Math.max(a.parts.length, b.parts.length);
  for (let i = 0; i < len; i++) {
    const av = a.parts[i] !== undefined ? a.parts[i] : 0;
    const bv = b.parts[i] !== undefined ? b.parts[i] : 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }

  // Numeric value is equal at this point. Apply type tie-breaker so that
  // semver strings always take priority over plain numbers, and numbers
  // take priority over "no version".
  if (a.type === b.type) return 0;
  if (a.type === 'semver' && b.type !== 'semver') return 1;
  if (b.type === 'semver' && a.type !== 'semver') return -1;

  if (a.type === 'number' && b.type === 'none') {
    return a.parts[0] === 0 ? 0 : 1;
  }
  if (b.type === 'number' && a.type === 'none') {
    return b.parts[0] === 0 ? 0 : -1;
  }

  return 0;
}

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
    if (['actions', 'components'].includes(key) && value && typeof value === 'object') {
      if (!target[key]) target[key] = {};

      for (const [comp_key, comp_def] of Object.entries(value)) {
        if (!target[key][comp_key]) {
          target[key][comp_key] = comp_def;
          continue;
        }

        const existing_comp = target[key][comp_key];
        const new_version_raw = comp_def && comp_def.version;
        const cur_version_raw = existing_comp && existing_comp.version;
        const cmp = compare_versions(new_version_raw, cur_version_raw);

        if (cmp > 0) {
          // Newer component definition replaces older one outright
          target[key][comp_key] = comp_def;
        } else {
          // Same or older version – augment without overwriting
          deep_merge_no_overwrite(existing_comp, comp_def);
        }
      }
      continue; // done with this top-level key
    }

    // DEPRECATED item_types handles (use items and config in collections instead)
    /* ───────────────────────────── Item types ───────────────────────────── */
    if (key === 'item_types' && value && typeof value === 'object') {
      if (!target.item_types) target.item_types = {};

      for (const [type_key, type_def] of Object.entries(value)) {
        if (!target.item_types[type_key]) {
          target.item_types[type_key] = type_def;
          continue;
        }

        const existing_type = target.item_types[type_key];
        const new_version_raw = type_def && type_def.version;
        const cur_version_raw = existing_type && existing_type.version;
        const cmp = compare_versions(new_version_raw, cur_version_raw);

        if (cmp > 0) {
          target.item_types[type_key] = type_def;
        } else {
          deep_merge_no_overwrite(existing_type, type_def);
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
