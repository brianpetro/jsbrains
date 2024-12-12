/**
 * Compares two values deeply to determine if they are equal.
 * @param {*} obj1 - The first value to compare.
 * @param {*} obj2 - The second value to compare.
 * @param {WeakMap} [visited=new WeakMap()] - WeakMap of visited objects to handle circular references.
 * @returns {boolean} True if the values are deeply equal, false otherwise.
 */
export function deep_equal(obj1, obj2, visited = new WeakMap()) {
  // Handle direct equality and null/undefined cases
  if (obj1 === obj2) return true;
  if (obj1 === null || obj2 === null || obj1 === undefined || obj2 === undefined) return false;
  
  // Handle different types, including Array check
  if (typeof obj1 !== typeof obj2 || Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  // Handle arrays
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => deep_equal(item, obj2[index], visited));
  }
  
  // Handle objects (but not arrays)
  if (typeof obj1 === 'object') {
    // Handle circular references
    if (visited.has(obj1)) return visited.get(obj1) === obj2;
    visited.set(obj1, obj2);

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;
    return keys1.every(key => deep_equal(obj1[key], obj2[key], visited));
  }
  
  // Handle other types
  return obj1 === obj2;
}