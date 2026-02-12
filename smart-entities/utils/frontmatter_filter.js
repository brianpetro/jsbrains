const to_string = (value) => `${value ?? ''}`.trim();

const to_lower = (value) => to_string(value).toLowerCase();

const to_lines = (value = '') => {
  if (Array.isArray(value)) return value;
  return to_string(value).split('\n');
};

/**
 * Parse newline-delimited frontmatter filters.
 *
 * Supports:
 * - `key`
 * - `key:value`
 *
 * @param {string|string[]} value
 * @returns {Array<{key:string,value:string|null}>}
 */
export function parse_frontmatter_filter_lines(value = '') {
  return to_lines(value)
    .map((line) => to_string(line))
    .filter((line) => line.length)
    .map((line) => {
      const separator_index = line.indexOf(':');
      if (separator_index === -1) {
        return { key: to_lower(line), value: null };
      }
      const key = to_lower(line.slice(0, separator_index));
      const entry_value = to_string(line.slice(separator_index + 1));
      return { key, value: entry_value.length ? to_lower(entry_value) : null };
    })
    .filter((entry) => entry.key.length);
}

const get_frontmatter_value = (metadata = {}, key = '') => {
  const metadata_key = Object.keys(metadata || {})
    .find((candidate_key) => to_lower(candidate_key) === key);
  if (!metadata_key) return undefined;
  return metadata[metadata_key];
};

const matches_entry = (metadata = {}, entry) => {
  const metadata_value = get_frontmatter_value(metadata, entry.key);
  if (metadata_value == null) return false;
  if (entry.value == null) return true;
  if (Array.isArray(metadata_value)) {
    return metadata_value.some((value) => to_lower(value) === entry.value);
  }
  return to_lower(metadata_value) === entry.value;
};

/**
 * Apply include/exclude frontmatter filters.
 *
 * @param {object} metadata
 * @param {object} [frontmatter_filter]
 * @param {Array<{key:string,value:string|null}>} [frontmatter_filter.include]
 * @param {Array<{key:string,value:string|null}>} [frontmatter_filter.exclude]
 * @returns {boolean}
 */
export function filter_by_frontmatter(metadata = {}, frontmatter_filter = {}) {
  const include = frontmatter_filter.include || [];
  const exclude = frontmatter_filter.exclude || [];

  if (exclude.length && exclude.some((entry) => matches_entry(metadata, entry))) {
    return false;
  }

  if (!include.length) return true;
  return include.some((entry) => matches_entry(metadata, entry));
}
