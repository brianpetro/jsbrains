/**
 * Set a nested value on an object using dot notation, creating
 * intermediate objects when necessary.
 *
 * @param {Object} obj target object
 * @param {string} path dot notation path
 * @param {*} value value to assign
 * @param {?string} scope optional top-level scope key
 */
export function set_by_path(obj, path, value, scope = null) {
  const keys = path.split('.');
  if (scope) {
    keys.unshift(scope);
  }
  const final_key = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (!acc[key] || typeof acc[key] !== 'object') {
      acc[key] = {};
    }
    return acc[key];
  }, obj);
  target[final_key] = value;
}
