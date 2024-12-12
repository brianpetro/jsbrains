// merge two objects, overwriting existing properties with new_obj properties
export function ajson_merge(existing, new_obj) {
  if (new_obj === null) return null;
  if (new_obj === undefined) return existing;
  if (typeof new_obj !== 'object') return new_obj;
  if (typeof existing !== 'object' || existing === null) existing = {};

  const keys = Object.keys(new_obj);
  const length = keys.length;
  
  for (let i = 0; i < length; i++) {
    const key = keys[i];
    const new_val = new_obj[key];
    const existing_val = existing[key];

    if (Array.isArray(new_val)) {
      existing[key] = new_val.slice(); // Create a shallow copy
    } else if (is_object(new_val)) {
      existing[key] = ajson_merge(is_object(existing_val) ? existing_val : {}, new_val);
    } else if (new_val !== undefined) {
      existing[key] = new_val;
    }
  }
  
  return existing;
}

function is_object(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}