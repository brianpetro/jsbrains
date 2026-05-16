/**
 * @typedef {Object.<string, *>} CollectionItemData
 * @property {string} [key] - Stable item key within its collection.
 * @property {string} [class_name] - Runtime item class name used for persistence compatibility.
 */
export const CollectionItemData = {};

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
 * @callback CollectionFilterPredicate
 * @param {*} item - Collection item instance.
 * @returns {boolean} Whether the item should be included.
 */
export const CollectionFilterPredicate = function () {};

/**
 * @typedef {(CollectionFilterOptions|CollectionFilterPredicate)} CollectionFilterInput
 */
export const CollectionFilterInput = {};

/**
 * @typedef {Object} CollectionItemRef
 * @property {string} collection_key - Collection instance key.
 * @property {string} key - Item key within the collection.
 */
export const CollectionItemRef = {};

/**
 * @typedef {Object} CollectionOptions
 * @property {string} [collection_key] - Explicit collection key override.
 * @property {string} [data_dir] - Explicit data directory override.
 * @property {import('./smart-environment.js').SmartEnvClass} [item_type] - Explicit item constructor override.
 * @property {CollectionDataAdapterConfig} [data_adapter] - Explicit data adapter override.
 * @property {Object.<string, *>} [actions] - Collection-scoped actions.
 */
export const CollectionOptions = {};

/**
 * @typedef {Object} CollectionQueueOptions
 * @property {boolean} [force] - Force every item into the queue before processing.
 */
export const CollectionQueueOptions = {};

/**
 * @typedef {Object} CollectionEventPayload
 * @property {string} [collection_key] - Collection key associated with the event.
 * @property {string} [item_key] - Item key associated with the event.
 * @property {'info'|'warning'|'error'} [level] - Optional event severity.
 */
export const CollectionEventPayload = {};

/**
 * @callback CollectionEventCallback
 * @param {CollectionEventPayload & Object.<string, *>} payload - Event payload.
 * @returns {void}
 */
export const CollectionEventCallback = function () {};

/**
 * @typedef {Object} CollectionScoreParams
 * @property {CollectionFilterOptions} [filter] - Filter options applied before scoring.
 * @property {string} [score_algo_key] - Action key used to compute the score.
 */
export const CollectionScoreParams = {};

/**
 * @typedef {Object} CollectionScoreResult
 * @property {*} item - Matched item instance.
 * @property {number} [score] - Optional score returned by a scoring action.
 * @property {Object.<string, *>} [data] - Additional algorithm-specific score metadata.
 */
export const CollectionScoreResult = {};

/**
 * @typedef {Object} FileStat
 * @property {number} mtime - Last modified timestamp in milliseconds.
 */
export const FileStat = {};

/**
 * @typedef {Object} FileSystemAdapter
 * @property {(path: string, encoding?: string, opts?: Object.<string, *>) => Promise<string>} [read] - Read file contents.
 */
export const FileSystemAdapter = {};

/**
 * @typedef {Object} FileSystem
 * @property {string} [sep] - Path separator.
 * @property {FileSystemAdapter} [adapter] - Optional lower-level adapter.
 * @property {(path: string) => Promise<boolean>} exists - Whether a path exists.
 * @property {(path: string) => Promise<void>} mkdir - Create a directory.
 * @property {(path: string) => Promise<void>} remove - Remove a file.
 * @property {(path: string, recursive?: boolean) => Promise<void>} remove_dir - Remove a directory.
 * @property {(path: string, data: string) => Promise<void>} write - Write file contents.
 * @property {(path: string, data: string) => Promise<void>} append - Append file contents.
 * @property {(path: string, encoding?: string, opts?: Object.<string, *>) => Promise<string>} read - Read file contents.
 * @property {(path: string) => Promise<FileStat>} stat - Read file metadata.
 */
export const FileSystem = {};

/**
 * @typedef {Object.<string, *>} CollectionEnv
 * @property {(target: Object) => void} create_env_getter - Defines an env getter on the target object.
 * @property {import('./smart-environment.js').SmartEnvConfig} [config] - Merged Smart Environment config.
 * @property {Object.<string, *>} [opts] - Runtime environment options.
 * @property {Object.<string, *>} [settings] - Runtime settings store.
 * @property {Object.<string, *>} [collections] - Collection load-state registry.
 * @property {{emit?: Function, on?: Function, once?: Function}} [events] - Event bus.
 * @property {FileSystem} [data_fs] - Data filesystem adapter.
 * @property {(module_key: string) => *} [init_module] - Lazy module initializer.
 * @property {{save?: Function}} [smart_settings] - Settings persistence module.
 */
export const CollectionEnv = {};

/**
 * @typedef {Object} CollectionDataAdapterModule
 * @property {import('./smart-environment.js').SmartEnvClass} collection - Collection-level adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} item - Item-level adapter class.
 */
export const CollectionDataAdapterModule = {};

/**
 * @typedef {(import('./smart-environment.js').SmartEnvClass|CollectionDataAdapterModule)} CollectionDataAdapterConfig
 */
export const CollectionDataAdapterConfig = {};

/**
 * @typedef {Object} AjsonParseResult
 * @property {boolean} rewrite - Whether the persisted file should be rewritten.
 * @property {string|null} file_data - Rewritten AJSON content, or null when no rewrite content is available.
 */
export const AjsonParseResult = {};

/**
 * @typedef {Object} AjsonKeyParts
 * @property {string} collection_key - Collection key parsed from the AJSON entry key.
 * @property {string} item_key - Item key parsed from the AJSON entry key.
 * @property {boolean} [changed] - Whether the parsed key changed due to legacy compatibility mapping.
 */
export const AjsonKeyParts = {};
