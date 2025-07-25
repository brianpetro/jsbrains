/**
 * escape_html
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
export function escape_html(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
