/**
 * Deeply merge two objects, giving precedence to the source.
 * @param {Object} target
 * @param {Object} source
 * @returns {Object} Mutated target.
 */
export function deep_merge(target = {}, source = {}) {
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (
      is_plain_object(source[key]) &&
      is_plain_object(target[key])
    ) {
      deep_merge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function is_plain_object(o) {
  return o && typeof o === 'object' && !Array.isArray(o);
}
