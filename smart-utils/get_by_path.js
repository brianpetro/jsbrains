export function get_by_path(obj, path, settings_scope = null) {
  if (!path) return '';
  const keys = path.split('.');
  if (settings_scope) {
    keys.unshift(settings_scope);
  }
  const final_key = keys.pop();
  const instance = keys.reduce((acc, key) => acc && acc[key], obj);
  if (instance && typeof instance[final_key] === 'function') {
    return instance[final_key].bind(instance);
  }
  return instance ? instance[final_key] : undefined;
}
