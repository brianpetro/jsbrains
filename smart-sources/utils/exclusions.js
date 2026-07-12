/**
 * Normalize file or folder exclusions to their canonical array form.
 *
 * Arrays preserve commas inside valid paths. Strings are accepted only for
 * backward compatibility with the former CSV setting and cannot recover commas
 * that an older version already split. Empty and slash/star-only fragments are
 * discarded because they can match the filesystem root and abort source scans.
 *
 * @param {string|string[]} exclusions
 * @returns {string[]}
 */
export function normalize_exclusion_list(exclusions = []) {
  const values = Array.isArray(exclusions)
    ? exclusions
    : (exclusions || '').split(',')
  ;

  return [...new Set(
    values
      .map((value) => value.trim())
      .filter((value) => value && !/^[/*\\]+$/.test(value))
  )];
}
