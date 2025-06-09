/**
 * is_callable :: * → boolean
 * Internal helper – returns true when a value’s typeof is "function".
 *
 * @param {*} value
 * @returns {boolean}
 */
const is_callable = (value) => typeof value === 'function';

/**
 * is_class :: * → boolean
 * Treats a value as an ES2015+ class constructor when:
 *   1. it is callable, and
 *   2. its own "prototype" property descriptor is non-writable & non-configurable
 *      (catches transpiled / minified classes), or
 *   3. Function.prototype.toString starts with "class "
 *      (covers native syntax & most built-ins)
 *
 * No invocation occurs, so it is safe in shared libraries.
 *
 * @param {*} value
 * @returns {boolean}
 */
export const is_class = (value) => {
  if (!is_callable(value)) return false;

  const desc = Object.getOwnPropertyDescriptor(value, 'prototype');
  if (desc && !desc.writable && !desc.configurable) return true;

  const src = Function.prototype.toString.call(value);
  return /^class\s/.test(src);
};

/**
 * is_function :: * → boolean
 * Returns true for callables that are not classes.
 *
 * @param {*} value
 * @returns {boolean}
 */
export const is_function = (value) =>
  is_callable(value) && !is_class(value);
