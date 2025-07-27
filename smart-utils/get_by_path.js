/**
 * Retrieve a nested value from an object using dot notation.
 * If the resolved value is a function it is bound to its instance.
 *
 * @param {Object} obj source object
 * @param {string} path dot notation path
 * @param {?string} scope optional top-level scope key
 * @returns {*}
 */
export function get_by_path(obj, path, scope = null) {
  if (!path) return '';
  const keys = path.split('.');
  if (scope) {
    keys.unshift(scope);
  }
  const final_key = keys.pop();
  const instance = keys.reduce((acc, key) => acc && acc[key], obj);
  if (instance && typeof instance[final_key] === 'function') {
    return instance[final_key].bind(instance);
  }
  return instance ? instance[final_key] : undefined;
}
