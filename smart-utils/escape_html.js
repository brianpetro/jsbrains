/**
 * Escape HTML entities in text.
 * @param {string} value
 * @returns {string}
 */
export function escape_html(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
  ;
}