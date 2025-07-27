/**
 * Delete a nested value from an object using dot notation.
 *
 * @param {Object} obj target object
 * @param {string} path dot notation path
 * @param {?string} scope optional top-level scope key
 */
export function delete_by_path(obj, path, scope = null) {
  const keys = path.split('.');
  if (scope) {
    keys.unshift(scope);
  }
  const final_key = keys.pop();
  const instance = keys.reduce((acc, key) => acc && acc[key], obj);
  if (instance) {
    delete instance[final_key];
  }
}
