/**
 * @function is_plain_object
 * @description Checks for a non-null, non-array, non-function, non-Date object
 *              that has a plain Object prototype.
 * @param {*} o - The value to test.
 * @returns {boolean} True if `o` is a "plain" object.
 */
export function is_plain_object(o) {
  if (o === null) return false;
  if (typeof o !== 'object') return false;
  if (Array.isArray(o)) return false;
  if (o instanceof Function) return false;
  if (o instanceof Date) return false;
  return Object.getPrototypeOf(o) === Object.prototype;
}
