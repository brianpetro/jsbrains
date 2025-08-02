import { camel_case_to_snake_case } from "smart-utils/camel_case_to_snake_case.js";

/**
 * Normalizes the options for the SmartEnv instance (mutates the object)
 * - converts camelCase keys in `collections` to snake_case
 * - ensures `collections` values are objects with a `class` property
 * @param {Object} opts - The options to normalize.
 * @returns {Object} the mutated options object
 */
export function normalize_opts(opts) {
  if (!opts.collections) opts.collections = {};
  if (!opts.modules) opts.modules = {};
  if (!opts.items) opts.items = {};

  Object.entries(opts.collections).forEach(([key, val]) => {
    if (typeof val === 'function') {
      opts.collections[key] = { class: val };
    }
    const new_key = camel_case_to_snake_case(key);
    if (new_key !== key) {
      opts.collections[new_key] = opts.collections[key];
      delete opts.collections[key];
    }
    if(!opts.collections[new_key].collection_key) opts.collections[new_key].collection_key = new_key;
    if(val.item_type){
      opts.items[val.item_type.key || camel_case_to_snake_case(val.item_type.name)] = {
        class: val.item_type,
      };
    }
  });
  Object.entries(opts.modules).forEach(([key, val]) => {
    if (typeof val === 'function') {
      opts.modules[key] = { class: val };
    }
    const new_key = camel_case_to_snake_case(key);
    if (new_key !== key) {
      opts.modules[new_key] = opts.modules[key];
      delete opts.modules[key];
    }
  });
  // item_types
  /** @deprecated use opts.items instead */
  if (!opts.item_types) opts.item_types = {};
  if (!opts.items) opts.items = {};
  Object.entries(opts.item_types).forEach(([key, val]) => {
    if (typeof val === 'function') {
      const new_key = camel_case_to_snake_case(key);
      opts.items[new_key] = {
        class: val,
        actions: {},
        ...(opts.items[new_key] || {})
      };
    }
  });
  return opts;
}
