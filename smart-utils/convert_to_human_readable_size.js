/**
 * convert_to_human_readable_size
 * Format a byte count as a human readable string.
 * @param {number} size
 * @returns {string}
 */
export function convert_to_human_readable_size(size = 0) {
  if (size > 1000000) {
    return `${(size / 1000000).toFixed(1)} MB`;
  }
  if (size > 1000) {
    return `${(size / 1000).toFixed(1)} KB`;
  }
  return `${size} bytes`;
}
