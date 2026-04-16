/**
 * @typedef {Object} CollectionFilterOptions
 * @property {string} [exclude_key] - A single key to exclude.
 * @property {string[]} [exclude_keys] - Keys to exclude.
 * @property {string} [exclude_key_starts_with] - Exclude keys with this prefix.
 * @property {string[]} [exclude_key_starts_with_any] - Exclude keys with any of these prefixes.
 * @property {string} [exclude_key_includes] - Exclude keys containing this substring.
 * @property {string[]} [exclude_key_includes_any] - Exclude keys containing any of these substrings.
 * @property {string} [exclude_key_ends_with] - Exclude keys with this suffix.
 * @property {string[]} [exclude_key_ends_with_any] - Exclude keys with any of these suffixes.
 * @property {string} [key_starts_with] - Include only keys with this prefix.
 * @property {string[]} [key_starts_with_any] - Include only keys with any of these prefixes.
 * @property {string} [key_includes] - Include only keys containing this substring.
 * @property {string[]} [key_includes_any] - Include only keys containing any of these substrings.
 * @property {string} [key_ends_with] - Include only keys with this suffix.
 * @property {number} [first_n] - Stop after collecting the first N matches.
 */
export const CollectionFilterOptions = {};

/**
 * @typedef {Object} CollectionItemRef
 * @property {string} collection_key - Collection instance key.
 * @property {string} key - Item key within the collection.
 */
export const CollectionItemRef = {};

/**
 * @typedef {Object} CollectionQueueOptions
 * @property {boolean} [force] - Force every item into the queue before processing.
 */
export const CollectionQueueOptions = {};

/**
 * @typedef {Object} CollectionScoreResult
 * @property {*} item - Matched item instance.
 * @property {number} [score] - Optional score returned by a scoring action.
 * @property {Object.<string, *>} [data] - Additional algorithm-specific score metadata.
 */
export const CollectionScoreResult = {};

/**
 * @typedef {Object} CollectionDataAdapterModule
 * @property {import('./smart-environment.js').SmartEnvClass} collection - Collection-level adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} item - Item-level adapter class.
 */
export const CollectionDataAdapterModule = {};
