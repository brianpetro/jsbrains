/**
 * Convert CamelCase or camelCase to snake_case.
 * @param {string} str - Input string in camel or Pascal case.
 * @returns {string} snake_case string.
 */
export function camel_case_to_snake_case(str = '') {
  return str
    .replace(/([A-Z])/g, m => `_${m.toLowerCase()}`)
    .replace(/^_/, '')
    .replace(/2$/, '');
}
