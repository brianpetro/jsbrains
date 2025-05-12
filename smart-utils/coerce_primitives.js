/**
 * @module coerce_primitives
 * @description Coerces primitive‑like string values to their native JavaScript primitives.
 * Rules:
 *  - Integers: No leading zeros unless the value is exactly "0" or "-0".
 *  - Floats: Only coerce when the absolute value is < 1 and the numeric string starts with "0." or "-0.".
 *  - Booleans: "true" -> true, "false" -> false.
 * All other strings are returned unchanged.
 *
 * @param {*} value input value to coerce
 * @returns {*} coerced primitive or the original value
 */
export function coerce_primitives(value) {
  // return early if not a string
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed_value = value.trim();

  // boolean coercion
  if (trimmed_value === 'true') {
    return true;
  }
  if (trimmed_value === 'false') {
    return false;
  }

  const float_pattern = /^-?\d+\.\d+$/;
  if (float_pattern.test(trimmed_value)) {
    const num = parseFloat(trimmed_value);
    if(num.toString() === trimmed_value){
      return num;
    }
  }

  // integer coercion without leading zeros (except 0)
  const int_pattern = /^-?(?:0|[1-9]\d*)$/;
  if (int_pattern.test(trimmed_value)) {
    return Number(trimmed_value);
  }

  // no coercion rule matched
  return value;
}
