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

export function compare_versions(new_value, cur_value) {
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
 * Normalise a raw version value into a comparable representation.
 *
 * Rules:
 * - `null`/`undefined` → type "none", parts [0, 0, 0]
 * - number → type "number", parts [number, 0, 0]
 * - string → type "semver", parts from "x.y.z" (non-numeric segments treated as 0)
 *
 * @param {string|number|null|undefined} value
 * @returns {{ type: 'none'|'number'|'semver', parts: number[] }}
 */
export function normalize_version_value (value) {
  if (value === null || value === undefined) {
    return { type: 'none', parts: [0, 0, 0] };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { type: 'none', parts: [0, 0, 0] };
    }
    const major = Math.floor(value);
    const minor = Math.floor((value - major) * 10);
    return { type: 'number', parts: [major, minor, 0] };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return { type: 'none', parts: [0, 0, 0] };
    }

    const raw_parts = trimmed.split('.');
    const parts = raw_parts.map(part => {
      const match = part.match(/^\d+/);
      if (!match) return 0;
      const num = Number.parseInt(match[0], 10);
      return Number.isNaN(num) ? 0 : num;
    });

    while (parts.length < 3) {
      parts.push(0);
    }

    return {
      type: 'semver',
      parts
    };
  }

  // Any other type is treated as "no version"
  return { type: 'none', parts: [0, 0, 0] };
}