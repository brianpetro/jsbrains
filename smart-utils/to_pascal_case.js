/**
 * Convert a string to PascalCase.
 * Supports underscores, hyphens, spaces and camelCase words.
 *
 * @param {string} str input string
 * @returns {string} PascalCase string
 */
export function to_pascal_case(str = '') {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join('');
}
