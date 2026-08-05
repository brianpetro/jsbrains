export type CollectionItemData = {
    [x: string]: unknown;
};
/**
 * @typedef {Object.<string, unknown>} CollectionItemData
 * @property {string} [key] - Stable item key within its collection.
 * @property {string} [class_name] - Runtime item class name used for persistence compatibility.
 */
export const CollectionItemData: {};
export type CollectionFilterOptions = {
    /**
     * - A single key to exclude.
     */
    exclude_key?: string;
    /**
     * - Keys to exclude.
     */
    exclude_keys?: string[];
    /**
     * - Exclude keys with this prefix.
     */
    exclude_key_starts_with?: string;
    /**
     * - Exclude keys with any of these prefixes.
     */
    exclude_key_starts_with_any?: string[];
    /**
     * - Exclude keys containing this substring.
     */
    exclude_key_includes?: string;
    /**
     * - Exclude keys containing any of these substrings.
     */
    exclude_key_includes_any?: string[];
    /**
     * - Exclude keys with this suffix.
     */
    exclude_key_ends_with?: string;
    /**
     * - Exclude keys with any of these suffixes.
     */
    exclude_key_ends_with_any?: string[];
    /**
     * - Include only keys with this prefix.
     */
    key_starts_with?: string;
    /**
     * - Include only keys with any of these prefixes.
     */
    key_starts_with_any?: string[];
    /**
     * - Include only keys containing this substring.
     */
    key_includes?: string;
    /**
     * - Include only keys containing any of these substrings.
     */
    key_includes_any?: string[];
    /**
     * - Include only keys with this suffix.
     */
    key_ends_with?: string;
    /**
     * - Stop after collecting the first N matches.
     */
    first_n?: number;
};
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
export const CollectionFilterOptions: {};
export type CollectionFilterPredicate<TItem = unknown> = (item: TItem) => boolean;
export function CollectionFilterPredicate(): void;
export type CollectionFilterInput<TItem = unknown> = (CollectionFilterOptions | CollectionFilterPredicate<TItem>);
/**
 * @template [TItem=unknown]
 * @typedef {(CollectionFilterOptions|CollectionFilterPredicate<TItem>)} CollectionFilterInput
 */
export const CollectionFilterInput: {};
export type CollectionItemRef = {
    /**
     * - Collection instance key.
     */
    collection_key: string;
    /**
     * - Item key within the collection.
     */
    key: string;
};
/**
 * @typedef {Object} CollectionItemRef
 * @property {string} collection_key - Collection instance key.
 * @property {string} key - Item key within the collection.
 */
export const CollectionItemRef: {};
export type CollectionOptions = {
    /**
     * - Explicit collection key override.
     */
    collection_key?: string;
    /**
     * - Explicit data directory override.
     */
    data_dir?: string;
    /**
     * - Explicit item constructor override.
     */
    item_type?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Explicit data adapter override.
     */
    data_adapter?: CollectionDataAdapterConfig;
    /**
     * - Collection-scoped actions.
     */
    actions?: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {Object} CollectionOptions
 * @property {string} [collection_key] - Explicit collection key override.
 * @property {string} [data_dir] - Explicit data directory override.
 * @property {import('./smart-environment.js').SmartEnvClass} [item_type] - Explicit item constructor override.
 * @property {CollectionDataAdapterConfig} [data_adapter] - Explicit data adapter override.
 * @property {Object.<string, unknown>} [actions] - Collection-scoped actions.
 */
export const CollectionOptions: {};
export type CollectionQueueOptions = {
    /**
     * - Force every item into the queue before processing.
     */
    force?: boolean;
};
/**
 * @typedef {Object} CollectionQueueOptions
 * @property {boolean} [force] - Force every item into the queue before processing.
 */
export const CollectionQueueOptions: {};
export type CollectionEventPayloadOverrides = {
    /**
     * - Optional event severity.
     */
    level?: "info" | "warning" | "error";
};
/**
 * @typedef {Object} CollectionEventPayloadOverrides
 * @property {'info'|'warning'|'error'} [level] - Optional event severity.
 */
export const CollectionEventPayloadOverrides: {};
export type CollectionEventPayload = Omit<import("./smart-events.js").SmartEventPayload, keyof CollectionEventPayloadOverrides> & CollectionEventPayloadOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-events.js').SmartEventPayload,
 *   keyof CollectionEventPayloadOverrides
 * > & CollectionEventPayloadOverrides} CollectionEventPayload
 */
export const CollectionEventPayload: {};
export type CollectionEventCallback = (payload: CollectionEventPayload & {
    [x: string]: unknown;
}) => void;
export function CollectionEventCallback(): void;
export type CollectionScoreParams<TFilter = CollectionFilterOptions> = {
    /**
     * - Filter options applied before scoring.
     */
    filter?: TFilter;
    /**
     * - Action key used to compute the score.
     */
    score_algo_key?: string;
};
/**
 * @template [TFilter=CollectionFilterOptions]
 * @typedef {Object} CollectionScoreParams
 * @property {TFilter} [filter] - Filter options applied before scoring.
 * @property {string} [score_algo_key] - Action key used to compute the score.
 */
export const CollectionScoreParams: {};
export type CollectionScoreResult<TItem = unknown, TData = {
    [x: string]: unknown;
}, TScore = number> = {
    /**
     * - Matched item instance.
     */
    item: TItem;
    /**
     * - Optional score returned by a scoring action.
     */
    score?: TScore;
    /**
     * - Additional algorithm-specific score metadata.
     */
    data?: TData;
};
/**
 * @template [TItem=unknown]
 * @template [TData=Object.<string, unknown>]
 * @template [TScore=number]
 * @typedef {Object} CollectionScoreResult
 * @property {TItem} item - Matched item instance.
 * @property {TScore} [score] - Optional score returned by a scoring action.
 * @property {TData} [data] - Additional algorithm-specific score metadata.
 */
export const CollectionScoreResult: {};
/**
 * Canonical structural contract for a Smart Collections item instance.
 * Domain packages should add only their collection relationship and domain fields.
 */
export type CollectionItem<TData = {
    [x: string]: unknown;
}, TEnv = {
    [x: string]: unknown;
}, TActions = {
    [x: string]: unknown;
}, TFilter = CollectionFilterOptions, TScoreParams = CollectionScoreParams<CollectionFilterOptions>, TScoreOutput = unknown, TEventPayload = CollectionEventPayload> = {
    /**
     * - Stable item key within its collection.
     */
    key: string;
    /**
     * - Parent collection key.
     */
    collection_key: string;
    /**
     * - Persisted item data.
     */
    data: TData;
    /**
     * - Shared Smart Environment instance.
     */
    env: TEnv;
    /**
     * - Resolved item action map.
     */
    actions: TActions;
    /**
     * - Tests collection filters.
     */
    filter: (filter_opts?: TFilter) => boolean;
    /**
     * - Filters and scores the item.
     */
    filter_and_score: (params?: TScoreParams) => TScoreOutput;
    /**
     * - Queues the item for persistence.
     */
    queue_save: () => void;
    /**
     * - Queues the item for loading.
     */
    queue_load: () => void;
    /**
     * - Persists the item immediately.
     */
    save: () => Promise<void>;
    /**
     * - Loads the item immediately.
     */
    load: () => Promise<void>;
    /**
     * - Emits an item-scoped event.
     */
    emit_event: (event_key: string, payload?: TEventPayload) => void;
};
/**
 * Canonical structural contract for a Smart Collections item instance.
 * Domain packages should add only their collection relationship and domain fields.
 *
 * @template [TData=CollectionItemData]
 * @template [TEnv=CollectionEnv]
 * @template [TActions=Object.<string, unknown>]
 * @template [TFilter=CollectionFilterOptions]
 * @template [TScoreParams=CollectionScoreParams]
 * @template [TScoreOutput=unknown]
 * @template [TEventPayload=CollectionEventPayload]
 * @typedef {Object} CollectionItem
 * @property {string} key - Stable item key within its collection.
 * @property {string} collection_key - Parent collection key.
 * @property {TData} data - Persisted item data.
 * @property {TEnv} env - Shared Smart Environment instance.
 * @property {TActions} actions - Resolved item action map.
 * @property {(filter_opts?: TFilter) => boolean} filter - Tests collection filters.
 * @property {(params?: TScoreParams) => TScoreOutput} filter_and_score - Filters and scores the item.
 * @property {() => void} queue_save - Queues the item for persistence.
 * @property {() => void} queue_load - Queues the item for loading.
 * @property {() => Promise<void>} save - Persists the item immediately.
 * @property {() => Promise<void>} load - Loads the item immediately.
 * @property {(event_key: string, payload?: TEventPayload) => void} emit_event - Emits an item-scoped event.
 */
export const CollectionItem: {};
/**
 * Canonical structural contract for a Smart Collections collection instance.
 */
export type Collection<TItem = unknown, TEnv = {
    [x: string]: unknown;
}, TSettings = {
    [x: string]: unknown;
}> = {
    /**
     * - Stable collection key.
     */
    collection_key: string;
    /**
     * - Shared Smart Environment instance.
     */
    env: TEnv;
    /**
     * - Items keyed by item key.
     */
    items: {
        [x: string]: TItem;
    };
    /**
     * - Merged collection settings.
     */
    settings: TSettings;
    /**
     * - Retrieves one item by key.
     */
    get: (key: string) => TItem | undefined;
    /**
     * - Adds or replaces an item.
     */
    set: (item: TItem) => void;
    /**
     * - Filters collection items.
     */
    filter: (filter_opts?: CollectionFilterInput<TItem>) => TItem[];
    /**
     * - Alias for filter.
     */
    list: (filter_opts?: CollectionFilterInput<TItem>) => TItem[];
    /**
     * - Persists queued collection changes.
     */
    save: () => Promise<void> | void;
};
/**
 * Canonical structural contract for a Smart Collections collection instance.
 *
 * @template [TItem=unknown]
 * @template [TEnv=CollectionEnv]
 * @template [TSettings=Object.<string, unknown>]
 * @typedef {Object} Collection
 * @property {string} collection_key - Stable collection key.
 * @property {TEnv} env - Shared Smart Environment instance.
 * @property {Object.<string, TItem>} items - Items keyed by item key.
 * @property {TSettings} settings - Merged collection settings.
 * @property {(key: string) => TItem|undefined} get - Retrieves one item by key.
 * @property {(item: TItem) => void} set - Adds or replaces an item.
 * @property {(filter_opts?: CollectionFilterInput<TItem>) => TItem[]} filter - Filters collection items.
 * @property {(filter_opts?: CollectionFilterInput<TItem>) => TItem[]} list - Alias for filter.
 * @property {() => Promise<void>|void} save - Persists queued collection changes.
 */
export const Collection: {};
export type FileStat = {
    /**
     * - Last modified timestamp in milliseconds.
     */
    mtime: number;
};
/**
 * @typedef {Object} FileStat
 * @property {number} mtime - Last modified timestamp in milliseconds.
 */
export const FileStat: {};
export type FileSystemAdapter = {
    /**
     * - Read file contents.
     */
    read?: (path: string, encoding?: string, opts?: {
        [x: string]: unknown;
    }) => Promise<string>;
};
/**
 * @typedef {Object} FileSystemAdapter
 * @property {(path: string, encoding?: string, opts?: Object.<string, unknown>) => Promise<string>} [read] - Read file contents.
 */
export const FileSystemAdapter: {};
export type FileSystem = {
    /**
     * - Path separator.
     */
    sep?: string;
    /**
     * - Optional lower-level adapter.
     */
    adapter?: FileSystemAdapter;
    /**
     * - Whether a path exists.
     */
    exists: (path: string) => Promise<boolean>;
    /**
     * - Create a directory.
     */
    mkdir: (path: string) => Promise<void>;
    /**
     * - Remove a file.
     */
    remove: (path: string) => Promise<void>;
    /**
     * - Remove a directory.
     */
    remove_dir: (path: string, recursive?: boolean) => Promise<void>;
    /**
     * - Write file contents.
     */
    write: (path: string, data: string) => Promise<void>;
    /**
     * - Append file contents.
     */
    append: (path: string, data: string) => Promise<void>;
    /**
     * - Read file contents.
     */
    read: (path: string, encoding?: string, opts?: {
        [x: string]: unknown;
    }) => Promise<string>;
    /**
     * - Read file metadata.
     */
    stat: (path: string) => Promise<FileStat>;
};
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
 * @property {(path: string, encoding?: string, opts?: Object.<string, unknown>) => Promise<string>} read - Read file contents.
 * @property {(path: string) => Promise<FileStat>} stat - Read file metadata.
 */
export const FileSystem: {};
export type CollectionEnv = {
    [x: string]: unknown;
};
/**
 * @typedef {Object.<string, unknown>} CollectionEnv
 * @property {(target: Object) => void} create_env_getter - Defines an env getter on the target object.
 * @property {import('./smart-environment.js').SmartEnvConfig} [config] - Merged Smart Environment config.
 * @property {Object.<string, unknown>} [opts] - Runtime environment options.
 * @property {Object.<string, unknown>} [settings] - Runtime settings store.
 * @property {Object.<string, unknown>} [collections] - Collection load-state registry.
 * @property {import('./smart-events.js').SmartEvents<CollectionEventPayload & Object.<string, unknown>>} [events] - Event bus.
 * @property {FileSystem} [data_fs] - Data filesystem adapter.
 * @property {(module_key: string) => unknown} [init_module] - Lazy module initializer.
 * @property {{save?: () => Promise<void>|void}} [smart_settings] - Settings persistence module.
 */
export const CollectionEnv: {};
export type CollectionDataAdapterModule = {
    /**
     * - Collection-level adapter class.
     */
    collection: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Item-level adapter class.
     */
    item: import("./smart-environment.js").SmartEnvClass;
};
/**
 * @typedef {Object} CollectionDataAdapterModule
 * @property {import('./smart-environment.js').SmartEnvClass} collection - Collection-level adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} item - Item-level adapter class.
 */
export const CollectionDataAdapterModule: {};
export type CollectionDataAdapterConfig = (import("./smart-environment.js").SmartEnvClass | CollectionDataAdapterModule);
/**
 * @typedef {(import('./smart-environment.js').SmartEnvClass|CollectionDataAdapterModule)} CollectionDataAdapterConfig
 */
export const CollectionDataAdapterConfig: {};
export type AjsonParseResult = {
    /**
     * - Whether the persisted file should be rewritten.
     */
    rewrite: boolean;
    /**
     * - Rewritten AJSON content, or null when no rewrite content is available.
     */
    file_data: string | null;
};
/**
 * @typedef {Object} AjsonParseResult
 * @property {boolean} rewrite - Whether the persisted file should be rewritten.
 * @property {string|null} file_data - Rewritten AJSON content, or null when no rewrite content is available.
 */
export const AjsonParseResult: {};
export type AjsonKeyParts = {
    /**
     * - Collection key parsed from the AJSON entry key.
     */
    collection_key: string;
    /**
     * - Item key parsed from the AJSON entry key.
     */
    item_key: string;
    /**
     * - Whether the parsed key changed due to legacy compatibility mapping.
     */
    changed?: boolean;
};
/**
 * @typedef {Object} AjsonKeyParts
 * @property {string} collection_key - Collection key parsed from the AJSON entry key.
 * @property {string} item_key - Item key parsed from the AJSON entry key.
 * @property {boolean} [changed] - Whether the parsed key changed due to legacy compatibility mapping.
 */
export const AjsonKeyParts: {};
