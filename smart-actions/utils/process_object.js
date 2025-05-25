// function to walk all properties of the results object (deep nested)
// inputs the object and a function to call on each property
// outputs the object with all properties walked
// returns the modified object
export async function process_object(obj, fn) {
  if (typeof obj !== 'object' || obj === null) {
    return await fn(obj);
  }

  if (obj instanceof Date) {
    return await fn(obj);
  }

  if (Array.isArray(obj)) {
    return await Promise.all(obj.map(item => process_object(item, fn)));
  }

  // Handle class instances
  if (obj.constructor !== Object) {
    return await fn(obj);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = await process_object(value, fn);
  }
  return result;
}