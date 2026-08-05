export type ConnectionsCollectionKey = "smart_sources" | "smart_blocks";
/**
 * @typedef {'smart_sources'|'smart_blocks'} ConnectionsCollectionKey
 */
export const ConnectionsCollectionKey: "";
export type ConnectionsStateEntry = {
    /**
     * - Timestamp indicating the result is hidden.
     */
    hidden?: number | null;
    /**
     * - Timestamp indicating the result is pinned.
     */
    pinned?: number | null;
};
/**
 * @typedef {Object} ConnectionsStateEntry
 * @property {number|null} [hidden] - Timestamp indicating the result is hidden.
 * @property {number|null} [pinned] - Timestamp indicating the result is pinned.
 */
export const ConnectionsStateEntry: {};
export type ConnectionsState = {
    [x: string]: ConnectionsStateEntry;
};
/**
 * @typedef {Object.<string, ConnectionsStateEntry>} ConnectionsState
 */
export const ConnectionsState: {};
export type ConnectionsComponentSettings = {
    render_markdown?: boolean;
    show_full_path?: boolean;
};
/**
 * @typedef {Object} ConnectionsComponentSettings
 * @property {boolean} [render_markdown]
 * @property {boolean} [show_full_path]
 */
export const ConnectionsComponentSettings: {};
export type ConnectionsComponentSettingsMap = {
    connections_list_v4?: ConnectionsComponentSettings;
    connections_list_v3?: ConnectionsComponentSettings;
    connections_list_item_v3?: ConnectionsComponentSettings;
};
/**
 * @typedef {Object} ConnectionsComponentSettingsMap
 * @property {ConnectionsComponentSettings} [connections_list_v4]
 * @property {ConnectionsComponentSettings} [connections_list_v3]
 * @property {ConnectionsComponentSettings} [connections_list_item_v3]
 */
export const ConnectionsComponentSettingsMap: {};
export type ConnectionsListSettings = {
    results_collection_key?: ConnectionsCollectionKey;
    score_algo_key?: string;
    connections_post_process?: string;
    results_limit?: number;
    connections_view_location?: "left" | "right" | "root" | "tab";
    exclude_frontmatter_blocks?: boolean;
    connections_list_component_key?: string;
    footer_connections_list_component_key?: string;
    connections_list_item_component_key?: string;
    frontmatter_filter_include?: string;
    frontmatter_filter_exclude?: string;
    expanded_view?: boolean;
    inline_connections?: boolean;
    inline_connections_score_threshold?: number;
    footer_connections?: boolean;
    embed_blocks?: boolean;
    components?: ConnectionsComponentSettingsMap;
    actions?: {
        [x: string]: string;
    };
};
/**
 * @typedef {Object} ConnectionsListSettings
 * @property {ConnectionsCollectionKey} [results_collection_key]
 * @property {string} [score_algo_key]
 * @property {string} [connections_post_process]
 * @property {number} [results_limit]
 * @property {'left'|'right'|'root'|'tab'} [connections_view_location]
 * @property {boolean} [exclude_frontmatter_blocks]
 * @property {string} [connections_list_component_key]
 * @property {string} [footer_connections_list_component_key]
 * @property {string} [connections_list_item_component_key]
 * @property {string} [frontmatter_filter_include]
 * @property {string} [frontmatter_filter_exclude]
 * @property {boolean} [expanded_view]
 * @property {boolean} [inline_connections]
 * @property {number} [inline_connections_score_threshold]
 * @property {boolean} [footer_connections]
 * @property {boolean} [embed_blocks]
 * @property {ConnectionsComponentSettingsMap} [components]
 * @property {Object.<string, string>} [actions]
 */
export const ConnectionsListSettings: {};
export type LegacyConnectionsSettings = {
    inline_connections?: boolean;
    inline_connections_score_threshold?: number;
    footer_connections?: boolean;
    rank_model?: string;
};
/**
 * @typedef {Object} LegacyConnectionsSettings
 * @property {boolean} [inline_connections]
 * @property {number} [inline_connections_score_threshold]
 * @property {boolean} [footer_connections]
 * @property {string} [rank_model]
 */
export const LegacyConnectionsSettings: {};
export type ConnectionsRootSettings = {
    connections_pro?: LegacyConnectionsSettings;
    connections_lists?: ConnectionsListSettings;
};
/**
 * @typedef {Object} ConnectionsRootSettings
 * @property {LegacyConnectionsSettings} [connections_pro]
 * @property {ConnectionsListSettings} [connections_lists]
 */
export const ConnectionsRootSettings: {};
export type ConnectionsItemData = import("./smart-entities.js").SmartEntityData & import("./smart-sources.js").SmartSourceData & import("./smart-blocks.js").SmartBlockData & {
    collection_key?: ConnectionsCollectionKey;
    item_key?: string;
    connections?: ConnectionsState;
    hidden_connections?: {
        [x: string]: number | null | undefined;
    };
    connections_list_component_key?: string;
};
/**
 * @typedef {import('./smart-entities.js').SmartEntityData & import('./smart-sources.js').SmartSourceData & import('./smart-blocks.js').SmartBlockData & {
 *   collection_key?: ConnectionsCollectionKey,
 *   item_key?: string,
 *   connections?: ConnectionsState,
 *   hidden_connections?: Object.<string, number|null|undefined>,
 *   connections_list_component_key?: string
 * }} ConnectionsItemData
 */
export const ConnectionsItemData: {};
export type ConnectionsFilterOverrides = {
    frontmatter?: import("./smart-entities.js").FrontmatterFilter;
};
/**
 * @typedef {Object} ConnectionsFilterOverrides
 * @property {import('./smart-entities.js').FrontmatterFilter} [frontmatter]
 */
export const ConnectionsFilterOverrides: {};
export type ConnectionsFilter = Omit<import("./smart-collections.js").CollectionFilterOptions, keyof ConnectionsFilterOverrides> & ConnectionsFilterOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-collections.js').CollectionFilterOptions,
 *   keyof ConnectionsFilterOverrides
 * > & ConnectionsFilterOverrides} ConnectionsFilter
 */
export const ConnectionsFilter: {};
export type ConnectionsQueryParamsOverrides = {
    limit?: number;
    results_collection_key?: ConnectionsCollectionKey;
    score_algo_key?: string;
    filter?: ConnectionsFilter;
    to_item?: ConnectionItem;
    hidden?: ConnectionItem[];
    hidden_keys?: string[];
    pinned?: ConnectionItem[];
    pinned_keys?: string[];
};
/**
 * @typedef {Object} ConnectionsQueryParamsOverrides
 * @property {number} [limit]
 * @property {ConnectionsCollectionKey} [results_collection_key]
 * @property {string} [score_algo_key]
 * @property {ConnectionsFilter} [filter]
 * @property {ConnectionItem} [to_item]
 * @property {ConnectionItem[]} [hidden]
 * @property {string[]} [hidden_keys]
 * @property {ConnectionItem[]} [pinned]
 * @property {string[]} [pinned_keys]
 */
export const ConnectionsQueryParamsOverrides: {};
export type ConnectionsQueryParams = Omit<import("./smart-collections.js").CollectionScoreParams<ConnectionsFilter>, keyof ConnectionsQueryParamsOverrides> & ConnectionsQueryParamsOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-collections.js').CollectionScoreParams<ConnectionsFilter>,
 *   keyof ConnectionsQueryParamsOverrides
 * > & ConnectionsQueryParamsOverrides} ConnectionsQueryParams
 */
export const ConnectionsQueryParams: {};
export type ConnectionResultOverrides = {
    item: ConnectionItem;
    score?: number | null;
    score_display?: number | string | null;
    og_score?: number | null;
    error?: string;
    connections_list?: ConnectionsListScope;
    is_hidden?: boolean;
    prefixed_key?: string;
};
/**
 * @typedef {Object} ConnectionResultOverrides
 * @property {ConnectionItem} item
 * @property {number|null} [score]
 * @property {number|string|null} [score_display]
 * @property {number|null} [og_score]
 * @property {string} [error]
 * @property {ConnectionsListScope} [connections_list]
 * @property {boolean} [is_hidden]
 * @property {string} [prefixed_key]
 */
export const ConnectionResultOverrides: {};
export type ConnectionResult = Omit<import("./smart-collections.js").CollectionScoreResult<unknown, ConnectionsItemData, number | null>, keyof ConnectionResultOverrides> & ConnectionResultOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-collections.js').CollectionScoreResult<unknown, ConnectionsItemData, number|null>,
 *   keyof ConnectionResultOverrides
 * > & ConnectionResultOverrides} ConnectionResult
 */
export const ConnectionResult: {};
export type ConnectionScoreFunction = (params?: ConnectionsQueryParams) => Partial<ConnectionResult> | null | undefined;
export function ConnectionScoreFunction(): void;
export type ConnectionItemOverrides = {
    collection_key: ConnectionsCollectionKey;
    path: string;
    link?: string;
    lines?: number[];
    vec?: number[] | Float32Array;
    data: ConnectionsItemData;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    collection: ConnectionsCollection;
    connections?: ConnectionsListScope;
    blocks?: ConnectionItem[];
    source?: ConnectionItem;
    file?: import("obsidian").TFile;
    embed_link?: string;
    is_media?: boolean;
    should_embed?: boolean;
    score?: ConnectionScoreFunction;
    filter_and_score: (params?: ConnectionsQueryParams) => ConnectionResult | null | undefined;
    read: () => Promise<string>;
    queue_import: () => void;
};
/**
 * @typedef {Object} ConnectionItemOverrides
 * @property {ConnectionsCollectionKey} collection_key
 * @property {string} path
 * @property {string} [link]
 * @property {number[]} [lines]
 * @property {number[]|Float32Array} [vec]
 * @property {ConnectionsItemData} data
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsCollection} collection
 * @property {ConnectionsListScope} [connections]
 * @property {ConnectionItem[]} [blocks]
 * @property {ConnectionItem} [source]
 * @property {import('obsidian').TFile} [file]
 * @property {string} [embed_link]
 * @property {boolean} [is_media]
 * @property {boolean} [should_embed]
 * @property {ConnectionScoreFunction} [score]
 * @property {(params?: ConnectionsQueryParams) => ConnectionResult|null|undefined} filter_and_score
 * @property {() => Promise<string>} read
 * @property {() => void} queue_import
 */
export const ConnectionItemOverrides: {};
export type ConnectionItem = Omit<import("./smart-collections.js").CollectionItem<ConnectionsItemData, import("./smart-collections.js").CollectionEnv, {
    [x: string]: unknown;
}, ConnectionsFilter, import("./smart-collections.js").CollectionScoreParams<ConnectionsFilter>, unknown, ConnectionsEventPayload>, keyof ConnectionItemOverrides> & ConnectionItemOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-collections.js').CollectionItem<
 *     ConnectionsItemData,
 *     import('./smart-collections.js').CollectionEnv,
 *     Object.<string, unknown>,
 *     ConnectionsFilter,
 *     import('./smart-collections.js').CollectionScoreParams<ConnectionsFilter>,
 *     unknown,
 *     ConnectionsEventPayload
 *   >,
 *   keyof ConnectionItemOverrides
 * > & ConnectionItemOverrides} ConnectionItem
 */
export const ConnectionItem: {};
export type ConnectionsCollectionOverrides = {
    collection_key: ConnectionsCollectionKey;
    items: {
        [x: string]: ConnectionItem;
    };
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    fs?: import("./smart-fs.js").SmartFs;
    settings: ConnectionsListSettings;
    get: (key: string) => ConnectionItem | undefined;
    set: (item: ConnectionItem) => void;
    new_item?: (item: ConnectionItem) => ConnectionItem;
    init_file_path?: (path: string) => ConnectionItem | undefined;
    process_source_import_queue?: () => Promise<void> | void;
};
/**
 * @typedef {Object} ConnectionsCollectionOverrides
 * @property {ConnectionsCollectionKey} collection_key
 * @property {Object.<string, ConnectionItem>} items
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {import('./smart-fs.js').SmartFs} [fs]
 * @property {ConnectionsListSettings} settings
 * @property {(key: string) => ConnectionItem|undefined} get
 * @property {(item: ConnectionItem) => void} set
 * @property {(item: ConnectionItem) => ConnectionItem} [new_item]
 * @property {(path: string) => ConnectionItem|undefined} [init_file_path]
 * @property {() => Promise<void>|void} [process_source_import_queue]
 */
export const ConnectionsCollectionOverrides: {};
export type ConnectionsCollection = Omit<import("./smart-collections.js").Collection<unknown, import("./smart-collections.js").CollectionEnv, {
    [x: string]: unknown;
}>, keyof ConnectionsCollectionOverrides> & ConnectionsCollectionOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-collections.js').Collection<
 *     unknown,
 *     import('./smart-collections.js').CollectionEnv,
 *     Object.<string, unknown>
 *   >,
 *   keyof ConnectionsCollectionOverrides
 * > & ConnectionsCollectionOverrides} ConnectionsCollection
 */
export const ConnectionsCollection: {};
export type ConnectionsSourcesCollectionOverrides = {
    init_file_path: (path: string) => ConnectionItem | undefined;
};
/**
 * @typedef {Object} ConnectionsSourcesCollectionOverrides
 * @property {(path: string) => ConnectionItem|undefined} init_file_path
 */
export const ConnectionsSourcesCollectionOverrides: {};
export type ConnectionsSourcesCollection = Omit<ConnectionsCollection, keyof ConnectionsSourcesCollectionOverrides> & ConnectionsSourcesCollectionOverrides;
/**
 * @typedef {Omit<ConnectionsCollection, keyof ConnectionsSourcesCollectionOverrides> & ConnectionsSourcesCollectionOverrides} ConnectionsSourcesCollection
 */
export const ConnectionsSourcesCollection: {};
export type ConnectionsListData = {
    collection_key: ConnectionsCollectionKey;
    item_key: string;
    connections_list_component_key?: string;
};
/**
 * @typedef {Object} ConnectionsListData
 * @property {ConnectionsCollectionKey} collection_key
 * @property {string} item_key
 * @property {string} [connections_list_component_key]
 */
export const ConnectionsListData: {};
export type ConnectionsAction = (...args: unknown[]) => unknown | Promise<unknown>;
export function ConnectionsAction(): void;
export type ConnectionsActions = {
    [x: string]: ConnectionsAction;
};
/**
 * @typedef {Object.<string, ConnectionsAction>} ConnectionsActions
 * @property {ConnectionsAction} [connections_list_pre_process]
 * @property {ConnectionsAction} [connections_list_refresh]
 * @property {ConnectionsAction} [connections_list_toggle_expanded]
 * @property {ConnectionsAction} [connections_list_send_to_context]
 * @property {ConnectionsAction} [connections_list_copy_as_links]
 * @property {ConnectionsAction} [connections_list_open_settings]
 * @property {ConnectionsAction} [connections_list_open_help]
 */
export const ConnectionsActions: {};
export type ConnectionsListScopeOverrides = {
    data: ConnectionsListData;
    item: ConnectionItem;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    collection: ConnectionsListsCollection;
    settings: ConnectionsListSettings;
    actions: ConnectionsActions;
    results: ConnectionResult[];
    _results_promise?: Promise<ConnectionResult[]> | null;
    get_results: (params?: ConnectionsQueryParams | ConnectionsComponentOptions) => Promise<ConnectionResult[]>;
    _get_results?: (params?: ConnectionsQueryParams) => Promise<ConnectionResult[]>;
    filter_and_score?: (params?: ConnectionsQueryParams) => ConnectionResult[];
    post_process?: (results: ConnectionResult[], params?: ConnectionsQueryParams) => Promise<ConnectionResult[]>;
    pre_process?: (params: ConnectionsQueryParams) => Promise<void> | void;
    connections_list_component_key: string;
};
/**
 * @typedef {Object} ConnectionsListScopeOverrides
 * @property {ConnectionsListData} data
 * @property {ConnectionItem} item
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsListsCollection} collection
 * @property {ConnectionsListSettings} settings
 * @property {ConnectionsActions} actions
 * @property {ConnectionResult[]} results
 * @property {Promise<ConnectionResult[]>|null} [_results_promise]
 * @property {(params?: ConnectionsQueryParams|ConnectionsComponentOptions) => Promise<ConnectionResult[]>} get_results
 * @property {(params?: ConnectionsQueryParams) => Promise<ConnectionResult[]>} [_get_results]
 * @property {(params?: ConnectionsQueryParams) => ConnectionResult[]} [filter_and_score]
 * @property {(results: ConnectionResult[], params?: ConnectionsQueryParams) => Promise<ConnectionResult[]>} [post_process]
 * @property {(params: ConnectionsQueryParams) => Promise<void>|void} [pre_process]
 * @property {string} connections_list_component_key
 */
export const ConnectionsListScopeOverrides: {};
export type ConnectionsListScope = Omit<import("./smart-collections.js").CollectionItem<ConnectionsListData, import("./smart-collections.js").CollectionEnv, {
    [x: string]: unknown;
}, ConnectionsFilter, import("./smart-collections.js").CollectionScoreParams<ConnectionsFilter>, unknown, ConnectionsEventPayload>, keyof ConnectionsListScopeOverrides> & ConnectionsListScopeOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-collections.js').CollectionItem<
 *     ConnectionsListData,
 *     import('./smart-collections.js').CollectionEnv,
 *     Object.<string, unknown>,
 *     ConnectionsFilter,
 *     import('./smart-collections.js').CollectionScoreParams<ConnectionsFilter>,
 *     unknown,
 *     ConnectionsEventPayload
 *   >,
 *   keyof ConnectionsListScopeOverrides
 * > & ConnectionsListScopeOverrides} ConnectionsListScope
 */
export const ConnectionsListScope: {};
export type ConnectionsListsCollectionOverrides = {
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    collection_key: string;
    settings: ConnectionsListSettings;
    results_collection_key: ConnectionsCollectionKey;
    score_algo_key: string;
    frontmatter_inclusions: import("./smart-entities.js").FrontmatterFilterEntry[];
    frontmatter_exclusions: import("./smart-entities.js").FrontmatterFilterEntry[];
    new_item: (item: ConnectionItem) => ConnectionsListScope;
    get: (key: string) => ConnectionsListScope | undefined;
    items: {
        [x: string]: ConnectionsListScope;
    };
    item_type: new (env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>, data: ConnectionsListData) => ConnectionsListScope;
    set: (item: ConnectionsListScope) => void;
    constructor: {
        default_settings: ConnectionsListSettings;
    };
    connections_list_component_settings_config?: import("./smart-environment.js").SettingsConfig;
    get_connections_list_component_options: () => import("./smart-environment.js").DropdownOption[];
    get_connections_list_item_options: () => import("./smart-environment.js").DropdownOption[];
};
/**
 * @typedef {Object} ConnectionsListsCollectionOverrides
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {string} collection_key
 * @property {ConnectionsListSettings} settings
 * @property {ConnectionsCollectionKey} results_collection_key
 * @property {string} score_algo_key
 * @property {import('./smart-entities.js').FrontmatterFilterEntry[]} frontmatter_inclusions
 * @property {import('./smart-entities.js').FrontmatterFilterEntry[]} frontmatter_exclusions
 * @property {(item: ConnectionItem) => ConnectionsListScope} new_item
 * @property {(key: string) => ConnectionsListScope|undefined} get
 * @property {Object.<string, ConnectionsListScope>} items
 * @property {new (env: import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>, data: ConnectionsListData) => ConnectionsListScope} item_type
 * @property {(item: ConnectionsListScope) => void} set
 * @property {{default_settings: ConnectionsListSettings}} constructor
 * @property {import('./smart-environment.js').SettingsConfig} [connections_list_component_settings_config]
 * @property {() => import('./smart-environment.js').DropdownOption[]} get_connections_list_component_options
 * @property {() => import('./smart-environment.js').DropdownOption[]} get_connections_list_item_options
 */
export const ConnectionsListsCollectionOverrides: {};
export type ConnectionsListsCollection = Omit<import("./smart-collections.js").Collection<unknown, import("./smart-collections.js").CollectionEnv, {
    [x: string]: unknown;
}>, keyof ConnectionsListsCollectionOverrides> & ConnectionsListsCollectionOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-collections.js').Collection<
 *     unknown,
 *     import('./smart-collections.js').CollectionEnv,
 *     Object.<string, unknown>
 *   >,
 *   keyof ConnectionsListsCollectionOverrides
 * > & ConnectionsListsCollectionOverrides} ConnectionsListsCollection
 */
export const ConnectionsListsCollection: {};
export type ConnectionsComponentModuleOverrides = {
    settings_config?: import("./smart-environment.js").SettingsConfig | ((scope: ConnectionsListsCollection) => import("./smart-environment.js").SettingsConfig);
};
/**
 * @typedef {Object} ConnectionsComponentModuleOverrides
 * @property {import('./smart-environment.js').SettingsConfig|((scope: ConnectionsListsCollection) => import('./smart-environment.js').SettingsConfig)} [settings_config]
 */
export const ConnectionsComponentModuleOverrides: {};
export type ConnectionsComponentModule = Omit<import("./smart-components.js").SmartEnvComponentConfig, keyof ConnectionsComponentModuleOverrides> & ConnectionsComponentModuleOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-components.js').SmartEnvComponentConfig,
 *   keyof ConnectionsComponentModuleOverrides
 * > & ConnectionsComponentModuleOverrides} ConnectionsComponentModule
 */
export const ConnectionsComponentModule: {};
export type ConnectionsActionModuleOverrides = {
    action: ConnectionsAction;
    pre_process?: ConnectionsAction;
    menus?: ConnectionsMenusConfig;
    commands?: ConnectionsCommandsConfig;
    ribbon_icons?: ConnectionsRibbonConfigMap;
    action_scope?: string;
    tool?: unknown;
    input_schema?: unknown;
    output_schema?: unknown;
};
/**
 * @typedef {Object} ConnectionsActionModuleOverrides
 * @property {ConnectionsAction} action
 * @property {ConnectionsAction} [pre_process]
 * @property {ConnectionsMenusConfig} [menus]
 * @property {ConnectionsCommandsConfig} [commands]
 * @property {ConnectionsRibbonConfigMap} [ribbon_icons]
 * @property {string} [action_scope]
 * @property {unknown} [tool]
 * @property {unknown} [input_schema]
 * @property {unknown} [output_schema]
 */
export const ConnectionsActionModuleOverrides: {};
export type ConnectionsActionModule = Omit<import("./smart-environment.js").SmartEnvActionConfig, keyof ConnectionsActionModuleOverrides> & ConnectionsActionModuleOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-environment.js').SmartEnvActionConfig,
 *   keyof ConnectionsActionModuleOverrides
 * > & ConnectionsActionModuleOverrides} ConnectionsActionModule
 */
export const ConnectionsActionModule: {};
export type ConnectionsEnvConfigOverrides = {
    components: {
        [x: string]: ConnectionsComponentModule;
    };
    actions: {
        [x: string]: ConnectionsActionModule;
    };
    collections: {
        [x: string]: import("./smart-environment.js").SmartEnvCollectionDefinition;
    } & {
        connections_lists: import("./smart-environment.js").SmartEnvCollectionConfig;
    };
};
/**
 * @typedef {Object} ConnectionsEnvConfigOverrides
 * @property {Object.<string, ConnectionsComponentModule>} components
 * @property {Object.<string, ConnectionsActionModule>} actions
 * @property {Object.<string, import('./smart-environment.js').SmartEnvCollectionDefinition> & {connections_lists: import('./smart-environment.js').SmartEnvCollectionConfig}} collections
 */
export const ConnectionsEnvConfigOverrides: {};
export type ConnectionsEnvConfig = Omit<import("./smart-environment.js").SmartEnvConfig, keyof ConnectionsEnvConfigOverrides> & ConnectionsEnvConfigOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-environment.js').SmartEnvConfig,
 *   keyof ConnectionsEnvConfigOverrides
 * > & ConnectionsEnvConfigOverrides} ConnectionsEnvConfig
 */
export const ConnectionsEnvConfig: {};
export type ConnectionsEventPayloadOverrides = {
    key?: string;
    keys?: string[];
    path?: string[];
    version?: string;
    elapsed_ms?: number;
    collection_key?: ConnectionsCollectionKey;
    item_key?: string;
    event_source?: string;
    source_key?: string;
    target_key?: string;
    link?: string;
    hide_mute_button?: boolean;
};
/**
 * @typedef {Object} ConnectionsEventPayloadOverrides
 * @property {string} [key]
 * @property {string[]} [keys]
 * @property {string[]} [path]
 * @property {string} [version]
 * @property {number} [elapsed_ms]
 * @property {ConnectionsCollectionKey} [collection_key]
 * @property {string} [item_key]
 * @property {string} [event_source]
 * @property {string} [source_key]
 * @property {string} [target_key]
 * @property {string} [link]
 * @property {boolean} [hide_mute_button]
 */
export const ConnectionsEventPayloadOverrides: {};
export type ConnectionsEventPayload = Omit<import("./smart-events.js").SmartEventPayload, keyof ConnectionsEventPayloadOverrides> & ConnectionsEventPayloadOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-events.js').SmartEventPayload,
 *   keyof ConnectionsEventPayloadOverrides
 * > & ConnectionsEventPayloadOverrides} ConnectionsEventPayload
 */
export const ConnectionsEventPayload: {};
export type ConnectionsContextCollection = {
    add_items?: (items: Array<{
        key: string;
        score: number;
    }>, opts?: object) => unknown;
};
/**
 * @typedef {Object} ConnectionsContextCollection
 * @property {(items: Array<{key: string, score: number}>, opts?: object) => unknown} [add_items]
 */
export const ConnectionsContextCollection: {};
export type ConnectionsCommandsRegistry = {
    commands: {
        [x: string]: import("obsidian").Command;
    };
    executeCommandById: (command_id: string) => boolean;
};
/**
 * @typedef {Object} ConnectionsCommandsRegistry
 * @property {Object.<string, import('obsidian').Command>} commands
 * @property {(command_id: string) => boolean} executeCommandById
 */
export const ConnectionsCommandsRegistry: {};
export type ConnectionsPluginsRegistry = {
    enabledPlugins: Set<string>;
    getPlugin: (plugin_id: string) => import("obsidian").Plugin | undefined;
    loadManifests: () => Promise<void> | void;
};
/**
 * @typedef {Object} ConnectionsPluginsRegistry
 * @property {Set<string>} enabledPlugins
 * @property {(plugin_id: string) => import('obsidian').Plugin|undefined} getPlugin
 * @property {() => Promise<void>|void} loadManifests
 */
export const ConnectionsPluginsRegistry: {};
export type ConnectionsSettingsManager = {
    open: () => Promise<void> | void;
    openTabById: (plugin_id: string) => Promise<void> | void;
};
/**
 * @typedef {Object} ConnectionsSettingsManager
 * @property {() => Promise<void>|void} open
 * @property {(plugin_id: string) => Promise<void>|void} openTabById
 */
export const ConnectionsSettingsManager: {};
export type ConnectionsMarkdownViewOverrides = {
    editor: import("obsidian").Editor & {
        cm?: import("@codemirror/view").EditorView;
    };
};
/**
 * @typedef {Object} ConnectionsMarkdownViewOverrides
 * @property {import('obsidian').Editor & {cm?: import('@codemirror/view').EditorView}} editor
 */
export const ConnectionsMarkdownViewOverrides: {};
export type ConnectionsMarkdownView = Omit<import("obsidian").MarkdownView, keyof ConnectionsMarkdownViewOverrides> & ConnectionsMarkdownViewOverrides;
/**
 * @typedef {Omit<
 *   import('obsidian').MarkdownView,
 *   keyof ConnectionsMarkdownViewOverrides
 * > & ConnectionsMarkdownViewOverrides} ConnectionsMarkdownView
 */
export const ConnectionsMarkdownView: {};
export type ConnectionsWorkspaceParent = {
    parent?: ConnectionsWorkspaceParent | null;
    collapsed?: boolean;
    setCollapsed?: (collapsed?: boolean) => void;
    expand?: () => void;
    toggle?: () => void;
};
/**
 * @typedef {Object} ConnectionsWorkspaceParent
 * @property {ConnectionsWorkspaceParent|null} [parent]
 * @property {boolean} [collapsed]
 * @property {(collapsed?: boolean) => void} [setCollapsed]
 * @property {() => void} [expand]
 * @property {() => void} [toggle]
 */
export const ConnectionsWorkspaceParent: {};
export type ConnectionsWorkspaceLeafOverrides = {
    parent?: ConnectionsWorkspaceParent | null;
};
/**
 * @typedef {Object} ConnectionsWorkspaceLeafOverrides
 * @property {ConnectionsWorkspaceParent|null} [parent]
 */
export const ConnectionsWorkspaceLeafOverrides: {};
export type ConnectionsWorkspaceLeaf = Omit<import("obsidian").WorkspaceLeaf, keyof ConnectionsWorkspaceLeafOverrides> & ConnectionsWorkspaceLeafOverrides;
/**
 * @typedef {Omit<
 *   import('obsidian').WorkspaceLeaf,
 *   keyof ConnectionsWorkspaceLeafOverrides
 * > & ConnectionsWorkspaceLeafOverrides} ConnectionsWorkspaceLeaf
 */
export const ConnectionsWorkspaceLeaf: {};
export type ConnectionsWorkspaceOverrides = {
    leftSplit?: ConnectionsWorkspaceParent | null;
    rightSplit?: ConnectionsWorkspaceParent | null;
};
/**
 * @typedef {Object} ConnectionsWorkspaceOverrides
 * @property {ConnectionsWorkspaceParent|null} [leftSplit]
 * @property {ConnectionsWorkspaceParent|null} [rightSplit]
 */
export const ConnectionsWorkspaceOverrides: {};
export type ConnectionsWorkspace = Omit<import("obsidian").Workspace, keyof ConnectionsWorkspaceOverrides> & ConnectionsWorkspaceOverrides;
/**
 * @typedef {Omit<
 *   import('obsidian').Workspace,
 *   keyof ConnectionsWorkspaceOverrides
 * > & ConnectionsWorkspaceOverrides} ConnectionsWorkspace
 */
export const ConnectionsWorkspace: {};
export type ConnectionsAppOverrides = {
    workspace: ConnectionsWorkspace;
    vault: import("obsidian").Vault;
    plugins: ConnectionsPluginsRegistry;
    commands: ConnectionsCommandsRegistry;
    setting: ConnectionsSettingsManager;
    loadLocalStorage?: (key: string) => string | null;
    saveLocalStorage?: (key: string, value: string) => void;
};
/**
 * @typedef {Object} ConnectionsAppOverrides
 * @property {ConnectionsWorkspace} workspace
 * @property {import('obsidian').Vault} vault
 * @property {ConnectionsPluginsRegistry} plugins
 * @property {ConnectionsCommandsRegistry} commands
 * @property {ConnectionsSettingsManager} setting
 * @property {(key: string) => string|null} [loadLocalStorage]
 * @property {(key: string, value: string) => void} [saveLocalStorage]
 */
export const ConnectionsAppOverrides: {};
export type ConnectionsApp = Omit<import("obsidian").App, keyof ConnectionsAppOverrides> & ConnectionsAppOverrides;
/**
 * @typedef {Omit<
 *   import('obsidian').App,
 *   keyof ConnectionsAppOverrides
 * > & ConnectionsAppOverrides} ConnectionsApp
 */
export const ConnectionsApp: {};
export type ConnectionsPluginOverrides = {
    app: ConnectionsApp;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    update_available?: boolean;
    latest_release_version?: string;
    connections_view_location_listener?: (() => void);
    connections_footer_view?: ConnectionsFooterViewScope;
    open_connections_view?: (params?: object) => unknown;
    _open_connections_view_base?: (...args: unknown[]) => unknown;
    open_note?: (target_path: string, event?: Event | null) => Promise<void> | void;
    get_editor_view: () => import("@codemirror/view").EditorView | null;
};
/**
 * @typedef {Object} ConnectionsPluginOverrides
 * @property {ConnectionsApp} app
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {boolean} [update_available]
 * @property {string} [latest_release_version]
 * @property {(() => void)} [connections_view_location_listener]
 * @property {ConnectionsFooterViewScope} [connections_footer_view]
 * @property {(params?: object) => unknown} [open_connections_view]
 * @property {(...args: unknown[]) => unknown} [_open_connections_view_base]
 * @property {(target_path: string, event?: Event|null) => Promise<void>|void} [open_note]
 * @property {() => import('@codemirror/view').EditorView|null} get_editor_view
 */
export const ConnectionsPluginOverrides: {};
export type ConnectionsPlugin = Omit<import("obsidian").Plugin, keyof ConnectionsPluginOverrides> & ConnectionsPluginOverrides;
/**
 * @typedef {Omit<
 *   import('obsidian').Plugin,
 *   keyof ConnectionsPluginOverrides
 * > & ConnectionsPluginOverrides} ConnectionsPlugin
 */
export const ConnectionsPlugin: {};
/**
 * Connections-specific extension fields layered onto the canonical SmartEnv.
 */
export type ConnectionsEnvExtensions = {
    settings: ConnectionsRootSettings;
    config: ConnectionsEnvConfig;
    events: import("./smart-events.js").SmartEvents<ConnectionsEventPayload>;
    smart_sources: ConnectionsSourcesCollection;
    smart_blocks: ConnectionsCollection;
    connections_lists: ConnectionsListsCollection;
    smart_components: import("./smart-components.js").SmartComponents<ConnectionsListScope | ConnectionResult | ConnectionsPlugin | ConnectionsItemViewScope | ConnectionsFooterViewScope | import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions> | ConnectionItem, ConnectionsComponentOptions>;
    smart_contexts?: ConnectionsContextCollection;
    smart_view: import("./smart-view.js").SmartViewInstance<unknown>;
    plugin?: ConnectionsPlugin;
    main?: ConnectionsPlugin;
    smart_connections_plugin?: ConnectionsPlugin;
    obsidian_app?: ConnectionsApp;
    fs?: import("./smart-fs.js").SmartFs;
    is_pro?: boolean;
    event_logs?: {
        settings?: {
            native_notice_attention?: boolean;
        };
    };
    smart_graph_plugin?: {
        _loaded?: boolean;
    };
    build_menu?: (menu_key: string, menu: ConnectionsMenu, scope: object, params?: ConnectionsActionParams) => void;
};
/**
 * Connections-specific extension fields layered onto the canonical SmartEnv.
 * @typedef {Object} ConnectionsEnvExtensions
 * @property {ConnectionsRootSettings} settings
 * @property {ConnectionsEnvConfig} config
 * @property {import('./smart-events.js').SmartEvents<ConnectionsEventPayload>} events
 * @property {ConnectionsSourcesCollection} smart_sources
 * @property {ConnectionsCollection} smart_blocks
 * @property {ConnectionsListsCollection} connections_lists
 * @property {import('./smart-components.js').SmartComponents<
 *   ConnectionsListScope|ConnectionResult|ConnectionsPlugin|ConnectionsItemViewScope|ConnectionsFooterViewScope|import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>|ConnectionItem,
 *   ConnectionsComponentOptions
 * >} smart_components
 * @property {ConnectionsContextCollection} [smart_contexts]
 * @property {import('./smart-view.js').SmartViewInstance<unknown>} smart_view
 * @property {ConnectionsPlugin} [plugin]
 * @property {ConnectionsPlugin} [main]
 * @property {ConnectionsPlugin} [smart_connections_plugin]
 * @property {ConnectionsApp} [obsidian_app]
 * @property {import('./smart-fs.js').SmartFs} [fs]
 * @property {boolean} [is_pro]
 * @property {{settings?: {native_notice_attention?: boolean}}} [event_logs]
 * @property {{_loaded?: boolean}} [smart_graph_plugin]
 * @property {(menu_key: string, menu: ConnectionsMenu, scope: object, params?: ConnectionsActionParams) => void} [build_menu]
 */
export const ConnectionsEnvExtensions: {};
export type ConnectionsPauseControls = {
    update: (paused: boolean) => void;
};
/**
 * @typedef {Object} ConnectionsPauseControls
 * @property {(paused: boolean) => void} update
 */
export const ConnectionsPauseControls: {};
export type ConnectionsItemViewScopeOverrides = {
    app: ConnectionsApp;
    plugin: ConnectionsPlugin;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    leaf: ConnectionsWorkspaceLeaf;
    container: ConnectionsDomElement;
    current: ConnectionItem | null | undefined;
    paused: boolean;
    pause_controls: ConnectionsPauseControls | null;
    connections_target_history?: string[];
    set_paused: (paused: boolean) => boolean;
    select_target: (target_item: ConnectionItem, params?: ConnectionsActionParams) => Promise<boolean>;
    render_target: (target_item?: ConnectionItem | null, params?: ConnectionsActionParams) => Promise<boolean>;
    render_view: (params?: ConnectionsComponentOptions, container?: HTMLElement) => Promise<void>;
    register_pause_controls: (controls: ConnectionsPauseControls) => void;
    register_env_listeners: () => void;
    open_settings: () => Promise<void>;
    toggle_paused?: (params?: ConnectionsActionParams) => Promise<boolean> | boolean;
    register?: (callback: () => void) => void;
};
/**
 * @typedef {Object} ConnectionsItemViewScopeOverrides
 * @property {ConnectionsApp} app
 * @property {ConnectionsPlugin} plugin
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsWorkspaceLeaf} leaf
 * @property {ConnectionsDomElement} container
 * @property {ConnectionItem|null|undefined} current
 * @property {boolean} paused
 * @property {ConnectionsPauseControls|null} pause_controls
 * @property {string[]} [connections_target_history]
 * @property {(paused: boolean) => boolean} set_paused
 * @property {(target_item: ConnectionItem, params?: ConnectionsActionParams) => Promise<boolean>} select_target
 * @property {(target_item?: ConnectionItem|null, params?: ConnectionsActionParams) => Promise<boolean>} render_target
 * @property {(params?: ConnectionsComponentOptions, container?: HTMLElement) => Promise<void>} render_view
 * @property {(controls: ConnectionsPauseControls) => void} register_pause_controls
 * @property {() => void} register_env_listeners
 * @property {() => Promise<void>} open_settings
 * @property {(params?: ConnectionsActionParams) => Promise<boolean>|boolean} [toggle_paused]
 * @property {(callback: () => void) => void} [register]
 */
export const ConnectionsItemViewScopeOverrides: {};
export type ConnectionsItemViewScope = Omit<import("./smart-view.js").SmartViewScope<ConnectionsListSettings, ConnectionsActions, import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>>, keyof ConnectionsItemViewScopeOverrides> & ConnectionsItemViewScopeOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-view.js').SmartViewScope<
 *     ConnectionsListSettings,
 *     ConnectionsActions,
 *     import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>
 *   >,
 *   keyof ConnectionsItemViewScopeOverrides
 * > & ConnectionsItemViewScopeOverrides} ConnectionsItemViewScope
 */
export const ConnectionsItemViewScope: {};
export type ConnectionsFooterViewScopeOverrides = {
    app: ConnectionsApp;
    plugin: ConnectionsPlugin;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    render_view: (params?: ConnectionsComponentOptions) => Promise<void> | void;
    container_map: {
        [x: string]: ConnectionsDomElement;
    };
    env_listeners?: Array<() => void>;
    _detach_visibility_guard: (() => void) | null;
    attach_visibility_guard: (editor_view: import("@codemirror/view").EditorView) => void;
    detach_visibility_guard: () => void;
    register_env_listener: (event_key: string, callback: (event: ConnectionsEventPayload) => void) => void;
    register_env_listeners: () => void;
    open_settings: () => Promise<void>;
    remove: () => void;
    unload: () => void;
};
/**
 * @typedef {Object} ConnectionsFooterViewScopeOverrides
 * @property {ConnectionsApp} app
 * @property {ConnectionsPlugin} plugin
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {(params?: ConnectionsComponentOptions) => Promise<void>|void} render_view
 * @property {Object.<string, ConnectionsDomElement>} container_map
 * @property {Array<() => void>} [env_listeners]
 * @property {(() => void)|null} _detach_visibility_guard
 * @property {(editor_view: import('@codemirror/view').EditorView) => void} attach_visibility_guard
 * @property {() => void} detach_visibility_guard
 * @property {(event_key: string, callback: (event: ConnectionsEventPayload) => void) => void} register_env_listener
 * @property {() => void} register_env_listeners
 * @property {() => Promise<void>} open_settings
 * @property {() => void} remove
 * @property {() => void} unload
 */
export const ConnectionsFooterViewScopeOverrides: {};
export type ConnectionsFooterViewScope = Omit<import("./smart-view.js").SmartViewScope<ConnectionsListSettings, ConnectionsActions, import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>>, keyof ConnectionsFooterViewScopeOverrides> & ConnectionsFooterViewScopeOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-view.js').SmartViewScope<
 *     ConnectionsListSettings,
 *     ConnectionsActions,
 *     import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>
 *   >,
 *   keyof ConnectionsFooterViewScopeOverrides
 * > & ConnectionsFooterViewScopeOverrides} ConnectionsFooterViewScope
 */
export const ConnectionsFooterViewScope: {};
export type ConnectionsSettingsTabScopeOverrides = {
    plugin: ConnectionsPlugin;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    plugin_container: ConnectionsDomElement;
    turn_off_listener?: (() => void);
    render_header: (container: ConnectionsDomElement) => Promise<void>;
    render_plugin_settings: (container: ConnectionsDomElement) => Promise<void>;
    register_env_events: () => void;
};
/**
 * @typedef {Object} ConnectionsSettingsTabScopeOverrides
 * @property {ConnectionsPlugin} plugin
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsDomElement} plugin_container
 * @property {(() => void)} [turn_off_listener]
 * @property {(container: ConnectionsDomElement) => Promise<void>} render_header
 * @property {(container: ConnectionsDomElement) => Promise<void>} render_plugin_settings
 * @property {() => void} register_env_events
 */
export const ConnectionsSettingsTabScopeOverrides: {};
export type ConnectionsSettingsTabScope = Omit<import("./smart-view.js").SmartViewScope<ConnectionsRootSettings, ConnectionsActions, import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>>, keyof ConnectionsSettingsTabScopeOverrides> & ConnectionsSettingsTabScopeOverrides;
/**
 * @typedef {Omit<
 *   import('./smart-view.js').SmartViewScope<
 *     ConnectionsRootSettings,
 *     ConnectionsActions,
 *     import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>
 *   >,
 *   keyof ConnectionsSettingsTabScopeOverrides
 * > & ConnectionsSettingsTabScopeOverrides} ConnectionsSettingsTabScope
 */
export const ConnectionsSettingsTabScope: {};
export type ConnectionsViewElement = HTMLElement & {
    _has_listeners?: boolean;
    _connections_menu_state?: ConnectionsMenuState;
};
/**
 * @typedef {HTMLElement & {
 *   _has_listeners?: boolean,
 *   _connections_menu_state?: ConnectionsMenuState
 * }} ConnectionsViewElement
 */
export const ConnectionsViewElement: {};
export type ConnectionsDomElement = HTMLElement & {
    _has_listeners?: boolean;
};
/**
 * @typedef {HTMLElement & {
 *   _has_listeners?: boolean
 * }} ConnectionsDomElement
 */
export const ConnectionsDomElement: {};
export type ConnectionsComponentOptions = {
    connections_item?: ConnectionItem;
    connections_settings?: ConnectionsListSettings;
    connections_list_component_key?: string;
    results?: ConnectionResult[];
    container?: HTMLElement;
    render_connections?: () => Promise<void> | void;
    event_key_domain?: string;
    to_item?: ConnectionItem;
    width?: number;
    height?: number;
    force?: boolean;
};
/**
 * @typedef {Object} ConnectionsComponentOptions
 * @property {ConnectionItem} [connections_item]
 * @property {ConnectionsListSettings} [connections_settings]
 * @property {string} [connections_list_component_key]
 * @property {ConnectionResult[]} [results]
 * @property {HTMLElement} [container]
 * @property {() => Promise<void>|void} [render_connections]
 * @property {string} [event_key_domain]
 * @property {ConnectionItem} [to_item]
 * @property {number} [width]
 * @property {number} [height]
 * @property {boolean} [force]
 */
export const ConnectionsComponentOptions: {};
export type ConnectionsMenuState = {
    view: ConnectionsItemViewScope;
    container: ConnectionsViewElement;
    connections_list: ConnectionsListScope;
    connections_settings?: ConnectionsListSettings;
};
/**
 * @typedef {Object} ConnectionsMenuState
 * @property {ConnectionsItemViewScope} view
 * @property {ConnectionsViewElement} container
 * @property {ConnectionsListScope} connections_list
 * @property {ConnectionsListSettings} [connections_settings]
 */
export const ConnectionsMenuState: {};
export type ConnectionsMenuItemOverrides = {
    setSubmenu: () => ConnectionsMenu;
};
/**
 * @typedef {Object} ConnectionsMenuItemOverrides
 * @property {() => ConnectionsMenu} setSubmenu
 */
export const ConnectionsMenuItemOverrides: {};
export type ConnectionsMenuItem = Omit<import("obsidian").MenuItem, keyof ConnectionsMenuItemOverrides> & ConnectionsMenuItemOverrides;
/**
 * @typedef {Omit<
 *   import('obsidian').MenuItem,
 *   keyof ConnectionsMenuItemOverrides
 * > & ConnectionsMenuItemOverrides} ConnectionsMenuItem
 */
export const ConnectionsMenuItem: {};
export type ConnectionsMenuOverrides = {
    items?: ConnectionsMenuItem[];
    addItem: (callback: (item: ConnectionsMenuItem) => unknown) => ConnectionsMenu;
    addSeparator: () => ConnectionsMenu;
    showAtPosition?: (position: {
        x: number;
        y: number;
    }) => void;
};
/**
 * @typedef {Object} ConnectionsMenuOverrides
 * @property {ConnectionsMenuItem[]} [items]
 * @property {(callback: (item: ConnectionsMenuItem) => unknown) => ConnectionsMenu} addItem
 * @property {() => ConnectionsMenu} addSeparator
 * @property {(position: {x: number, y: number}) => void} [showAtPosition]
 */
export const ConnectionsMenuOverrides: {};
export type ConnectionsMenu = Omit<import("obsidian").Menu, keyof ConnectionsMenuOverrides> & ConnectionsMenuOverrides;
/**
 * @typedef {Omit<
 *   import('obsidian').Menu,
 *   keyof ConnectionsMenuOverrides
 * > & ConnectionsMenuOverrides} ConnectionsMenu
 */
export const ConnectionsMenu: {};
export type ConnectionsActionParams = {
    to?: string;
    env?: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    plugin?: ConnectionsPlugin;
    app?: ConnectionsApp;
    workspace?: ConnectionsWorkspace;
    editor?: import("obsidian").Editor;
    target_item?: ConnectionItem;
    source_item?: ConnectionItem;
    connections_item?: ConnectionItem;
    target_name?: string;
    prefixed_key?: string;
    container?: HTMLElement;
    visible_results?: ConnectionResult[];
    connections_settings?: ConnectionsListSettings;
    render_connections?: (params?: ConnectionsComponentOptions) => Promise<void> | void;
    expanded?: boolean;
    event_source?: string;
    file_path?: string;
    click_event?: Event | MouseEvent;
    event?: Event | MouseEvent;
    url?: string;
    force?: boolean;
};
/**
 * @typedef {Object} ConnectionsActionParams
 * @property {string} [to]
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} [env]
 * @property {ConnectionsPlugin} [plugin]
 * @property {ConnectionsApp} [app]
 * @property {ConnectionsWorkspace} [workspace]
 * @property {import('obsidian').Editor} [editor]
 * @property {ConnectionItem} [target_item]
 * @property {ConnectionItem} [source_item]
 * @property {ConnectionItem} [connections_item]
 * @property {string} [target_name]
 * @property {string} [prefixed_key]
 * @property {HTMLElement} [container]
 * @property {ConnectionResult[]} [visible_results]
 * @property {ConnectionsListSettings} [connections_settings]
 * @property {(params?: ConnectionsComponentOptions) => Promise<void>|void} [render_connections]
 * @property {boolean} [expanded]
 * @property {string} [event_source]
 * @property {string} [file_path]
 * @property {Event|MouseEvent} [click_event]
 * @property {Event|MouseEvent} [event]
 * @property {string} [url]
 * @property {boolean} [force]
 */
export const ConnectionsActionParams: {};
export type ConnectionsActionRegistrationContext = {
    plugin: ConnectionsPlugin;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    app: ConnectionsApp;
    editor?: import("obsidian").Editor;
    params: ConnectionsActionParams;
};
/**
 * @typedef {Object} ConnectionsActionRegistrationContext
 * @property {ConnectionsPlugin} plugin
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsApp} app
 * @property {import('obsidian').Editor} [editor]
 * @property {ConnectionsActionParams} params
 */
export const ConnectionsActionRegistrationContext: {};
export type ConnectionsCommandConfig = {
    name: string;
    context?: string;
    register_when?: (context: ConnectionsActionRegistrationContext) => boolean;
    params?: (context: ConnectionsActionRegistrationContext) => ConnectionsActionParams;
    when?: (context: ConnectionsActionRegistrationContext) => boolean;
    get_scope?: (context: ConnectionsActionRegistrationContext) => object;
};
/**
 * @typedef {Object} ConnectionsCommandConfig
 * @property {string} name
 * @property {string} [context]
 * @property {(context: ConnectionsActionRegistrationContext) => boolean} [register_when]
 * @property {(context: ConnectionsActionRegistrationContext) => ConnectionsActionParams} [params]
 * @property {(context: ConnectionsActionRegistrationContext) => boolean} [when]
 * @property {(context: ConnectionsActionRegistrationContext) => object} [get_scope]
 */
export const ConnectionsCommandConfig: {};
export type ConnectionsCommandsConfig = {
    [x: string]: ConnectionsCommandConfig;
};
/**
 * @typedef {Object.<string, ConnectionsCommandConfig>} ConnectionsCommandsConfig
 */
export const ConnectionsCommandsConfig: {};
export type ConnectionsRibbonConfig = {
    icon_name: string;
    description: string;
    register_when?: (context: ConnectionsActionRegistrationContext) => boolean;
    get_scope?: (context: ConnectionsActionRegistrationContext) => object;
    params?: (context: ConnectionsActionRegistrationContext) => ConnectionsActionParams;
};
/**
 * @typedef {Object} ConnectionsRibbonConfig
 * @property {string} icon_name
 * @property {string} description
 * @property {(context: ConnectionsActionRegistrationContext) => boolean} [register_when]
 * @property {(context: ConnectionsActionRegistrationContext) => object} [get_scope]
 * @property {(context: ConnectionsActionRegistrationContext) => ConnectionsActionParams} [params]
 */
export const ConnectionsRibbonConfig: {};
export type ConnectionsRibbonConfigMap = {
    [x: string]: ConnectionsRibbonConfig;
};
/**
 * @typedef {Object.<string, ConnectionsRibbonConfig>} ConnectionsRibbonConfigMap
 */
export const ConnectionsRibbonConfigMap: {};
export type ConnectionsMenuContext = {
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    menu: ConnectionsMenu;
    params: ConnectionsActionParams;
    scope: ConnectionsListScope | ConnectionsListsCollection | ConnectionsItemViewScope | ConnectionItem;
    event_source?: string;
    resolve_action?: () => ConnectionsAction | undefined;
};
/**
 * @typedef {Object} ConnectionsMenuContext
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsMenu} menu
 * @property {ConnectionsActionParams} params
 * @property {ConnectionsListScope|ConnectionsListsCollection|ConnectionsItemViewScope|ConnectionItem} scope
 * @property {string} [event_source]
 * @property {() => ConnectionsAction|undefined} [resolve_action]
 */
export const ConnectionsMenuContext: {};
export type ConnectionsMenuConfig = {
    title: string | ((this: ConnectionsMenuContext) => string);
    icon?: string | ((this: ConnectionsMenuContext) => string);
    order?: number;
    disabled?: ((this: ConnectionsMenuContext) => boolean);
    build?: ((this: ConnectionsMenuContext) => void);
    when?: ((this: ConnectionsMenuContext) => boolean);
    params?: ((this: ConnectionsMenuContext, context: ConnectionsMenuContext, event?: Event) => ConnectionsActionParams);
};
/**
 * @typedef {Object} ConnectionsMenuConfig
 * @property {string|((this: ConnectionsMenuContext) => string)} title
 * @property {string|((this: ConnectionsMenuContext) => string)} [icon]
 * @property {number} [order]
 * @property {((this: ConnectionsMenuContext) => boolean)} [disabled]
 * @property {((this: ConnectionsMenuContext) => void)} [build]
 * @property {((this: ConnectionsMenuContext) => boolean)} [when]
 * @property {((this: ConnectionsMenuContext, context: ConnectionsMenuContext, event?: Event) => ConnectionsActionParams)} [params]
 */
export const ConnectionsMenuConfig: {};
export type ConnectionsMenusConfig = {
    [x: string]: ConnectionsMenuConfig;
};
/**
 * @typedef {Object.<string, ConnectionsMenuConfig>} ConnectionsMenusConfig
 */
export const ConnectionsMenusConfig: {};
export type ConnectionsReleaseAsset = {
    name: string;
    browser_download_url: string;
};
/**
 * @typedef {Object} ConnectionsReleaseAsset
 * @property {string} name
 * @property {string} browser_download_url
 */
export const ConnectionsReleaseAsset: {};
export type ConnectionsReleaseResponse = {
    tag_name: string;
    assets: ConnectionsReleaseAsset[];
};
/**
 * @typedef {Object} ConnectionsReleaseResponse
 * @property {string} tag_name
 * @property {ConnectionsReleaseAsset[]} assets
 */
export const ConnectionsReleaseResponse: {};
export type ConnectionsGraphResultEventDetail = {
    collection_key: string;
    item_key: string;
};
/**
 * @typedef {Object} ConnectionsGraphResultEventDetail
 * @property {string} collection_key
 * @property {string} item_key
 */
export const ConnectionsGraphResultEventDetail: {};
