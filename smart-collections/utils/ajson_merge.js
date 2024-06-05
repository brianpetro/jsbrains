// merge two objects, overwriting existing properties with new_obj properties
function deep_merge(existing, new_obj) {
  for (const key in new_obj) {
    if (Array.isArray(existing[key]) && Array.isArray(new_obj[key])) {
      // // Check if the first element of the array is also an array, indicating nested arrays
      // if (existing[key].length > 0 && Array.isArray(existing[key][0])) {
      //   // For nested arrays, merge the inner arrays by appending elements
      //   existing[key].forEach((item, index) => {
      //     if (Array.isArray(item) && new_obj[key][index] !== undefined) {
      //       existing[key][index] = item.concat(new_obj[key][index]);
      //     }
      //   });
      //   // If new_obj[key] has more items than existing[key], add them as well
      //   if (new_obj[key].length > existing[key].length) {
      //     existing[key] = existing[key].concat(new_obj[key].slice(existing[key].length));
      //   }
      // } else {
      //   // For non-nested arrays, merge elements
      //   existing[key] = existing[key].map((item, index) => {
      //     if (isObject(item) && isObject(new_obj[key][index])) {
      //       return deep_merge(item, new_obj[key][index]);
      //     }
      //     return item;
      //   });
      // }
      // replace existing array with new array
      existing[key] = new_obj[key];
    } else if (isObject(existing[key]) && isObject(new_obj[key])) {
      // Recursively merge objects
      existing[key] = deep_merge(existing[key], new_obj[key]);
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
exports.deep_merge = deep_merge;

