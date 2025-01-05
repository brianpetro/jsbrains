/**
 * @function any_source_has_key
 * @description Whether any config object in `sources` has `key` as an own property.
 */

export function any_source_has_key(sources, key) {
  return sources.some((src) => src && Object.prototype.hasOwnProperty.call(src, key));
}
