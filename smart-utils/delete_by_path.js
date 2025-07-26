export function delete_by_path(obj, path, settings_scope = null) {
  const keys = path.split('.');
  if (settings_scope) {
    keys.unshift(settings_scope);
  }
  const final_key = keys.pop();
  const instance = keys.reduce((acc, key) => acc && acc[key], obj);
  if (instance) {
    delete instance[final_key];
  }
}
