// merge two objects, overwriting existing properties with new_obj properties
export function deep_merge_with_array_handling(existing, new_obj) {
  for (const key in new_obj) {
    if (Array.isArray(existing[key]) && Array.isArray(new_obj[key])) {
      // Determine if arrays are nested arrays or arrays of primitives
      if (existing[key].length > 0 && typeof existing[key][0] === 'object' && !Array.isArray(existing[key][0])) {
        // For arrays of objects, merge objects at corresponding indices
        existing[key] = existing[key].map((item, index) => {
          if (typeof new_obj[key][index] === 'object') {
            return deep_merge_with_array_handling(item, new_obj[key][index]);
          }
          return item;
        }).concat(new_obj[key].slice(existing[key].length));
      } else if (existing[key].length > 0 && Array.isArray(existing[key][0])) {
        // For nested arrays, merge the inner arrays by appending unique elements
        existing[key] = existing[key].map((item, index) => {
          if (Array.isArray(new_obj[key][index])) {
            return [...new Set(item.concat(new_obj[key][index]))];
          }
          return item;
        }).concat(new_obj[key].slice(existing[key].length));
      } else {
        // For arrays of primitives (e.g., strings), concatenate them
        existing[key] = existing[key].concat(new_obj[key]);
      }
    } else if (typeof existing[key] === 'object' && typeof new_obj[key] === 'object' && !Array.isArray(existing[key])) {
      // Recursively merge objects
      existing[key] = deep_merge_with_array_handling(existing[key], new_obj[key]);
    } else {
      // Directly set the value for non-object and non-array types
      existing[key] = new_obj[key];
    }
  }
  return existing;
}

function isObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

// Exports
export default deep_merge_with_array_handling;
