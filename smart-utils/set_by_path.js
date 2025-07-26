export function set_by_path(obj, path, value, settings_scope = null) {
  const keys = path.split('.');
  if (settings_scope) {
    keys.unshift(settings_scope);
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
