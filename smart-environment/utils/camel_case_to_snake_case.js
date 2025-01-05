/**
 * @function camel_case_to_snake_case
 * @description Convert CamelCase => snake_case for consistent environment keys.
 */
export function camel_case_to_snake_case(str) {
  const result = str
    .replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
    .replace(/^_/, '') // remove leading underscore
    .replace(/2$/, '') // remove trailing 2 (bundled subclasses)
    ;
  return result;
}
