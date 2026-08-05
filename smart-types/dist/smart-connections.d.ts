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
export type ConnectionsFilter = {
    exclude_keys?: string[];
    exclude_key_starts_with_any?: string[];
    exclude_key_ends_with_any?: string[];
    frontmatter?: import("./smart-entities.js").FrontmatterFilter;
};
/**
 * @typedef {Object} ConnectionsFilter
 * @property {string[]} [exclude_keys]
 * @property {string[]} [exclude_key_starts_with_any]
 * @property {string[]} [exclude_key_ends_with_any]
 * @property {import('./smart-entities.js').FrontmatterFilter} [frontmatter]
 */
export const ConnectionsFilter: {};
export type ConnectionsQueryParams = {
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
 * @typedef {Object} ConnectionsQueryParams
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
export const ConnectionsQueryParams: {};
export type ConnectionResult = {
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
 * @typedef {Object} ConnectionResult
 * @property {ConnectionItem} item
 * @property {number|null} [score]
 * @property {number|string|null} [score_display]
 * @property {number|null} [og_score]
 * @property {string} [error]
 * @property {ConnectionsListScope} [connections_list]
 * @property {boolean} [is_hidden]
 * @property {string} [prefixed_key]
 */
export const ConnectionResult: {};
export type ConnectionScoreFunction = (params?: ConnectionsQueryParams) => Partial<ConnectionResult> | null | undefined;
export function ConnectionScoreFunction(): void;
export type ConnectionsFile = import("obsidian").TFile;
/**
 * @typedef {import('obsidian').TFile} ConnectionsFile
 */
export const ConnectionsFile: {};
export type ConnectionsFs = {
    file_paths?: string[];
    folder_paths?: string[];
    base_path?: string;
};
/**
 * @typedef {Object} ConnectionsFs
 * @property {string[]} [file_paths]
 * @property {string[]} [folder_paths]
 * @property {string} [base_path]
 */
export const ConnectionsFs: {};
export type ConnectionItem = {
    key: string;
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
    file?: ConnectionsFile;
    embed_link?: string;
    is_media?: boolean;
    should_embed?: boolean;
    score?: ConnectionScoreFunction;
    filter_and_score: (params?: ConnectionsQueryParams) => ConnectionResult | null | undefined;
    read: () => Promise<string>;
    queue_save: () => void;
    queue_import: () => void;
    emit_event: (event_key: string, payload?: ConnectionsEventPayload) => void;
};
/**
 * @typedef {Object} ConnectionItem
 * @property {string} key
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
 * @property {ConnectionsFile} [file]
 * @property {string} [embed_link]
 * @property {boolean} [is_media]
 * @property {boolean} [should_embed]
 * @property {ConnectionScoreFunction} [score]
 * @property {(params?: ConnectionsQueryParams) => ConnectionResult|null|undefined} filter_and_score
 * @property {() => Promise<string>} read
 * @property {() => void} queue_save
 * @property {() => void} queue_import
 * @property {(event_key: string, payload?: ConnectionsEventPayload) => void} emit_event
 */
export const ConnectionItem: {};
export type ConnectionsCollection = {
    items: {
        [x: string]: ConnectionItem;
    };
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    fs?: ConnectionsFs;
    settings: ConnectionsListSettings;
    get: (key: string) => ConnectionItem | undefined;
    set: (item: ConnectionItem) => void;
    new_item?: (item: ConnectionItem) => ConnectionItem;
    init_file_path?: (path: string) => ConnectionItem | undefined;
    save?: () => Promise<void> | void;
    process_source_import_queue?: () => Promise<void> | void;
};
/**
 * @typedef {Object} ConnectionsCollection
 * @property {Object.<string, ConnectionItem>} items
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsFs} [fs]
 * @property {ConnectionsListSettings} settings
 * @property {(key: string) => ConnectionItem|undefined} get
 * @property {(item: ConnectionItem) => void} set
 * @property {(item: ConnectionItem) => ConnectionItem} [new_item]
 * @property {(path: string) => ConnectionItem|undefined} [init_file_path]
 * @property {() => Promise<void>|void} [save]
 * @property {() => Promise<void>|void} [process_source_import_queue]
 */
export const ConnectionsCollection: {};
export type ConnectionsSourcesCollection = ConnectionsCollection & {
    init_file_path: (path: string) => ConnectionItem | undefined;
};
/**
 * @typedef {ConnectionsCollection & {
 *   init_file_path: (path: string) => ConnectionItem|undefined
 * }} ConnectionsSourcesCollection
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
export type ConnectionsListScope = {
    key: string;
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
    emit_event: (event_key: string, payload?: ConnectionsEventPayload) => void;
    connections_list_component_key: string;
};
/**
 * @typedef {Object} ConnectionsListScope
 * @property {string} key
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
 * @property {(event_key: string, payload?: ConnectionsEventPayload) => void} emit_event
 * @property {string} connections_list_component_key
 */
export const ConnectionsListScope: {};
export type ConnectionsListsCollection = Omit<ConnectionsCollection, "items" | "get" | "set" | "new_item"> & {
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
    get_connections_list_component_options: () => Array<{
        value: string;
        name: string;
        description?: string;
    }>;
    get_connections_list_item_options: () => Array<{
        value: string;
        name: string;
        description?: string;
    }>;
};
/**
 * @typedef {Omit<ConnectionsCollection, 'items'|'get'|'set'|'new_item'> & {
 *   settings: ConnectionsListSettings,
 *   results_collection_key: ConnectionsCollectionKey,
 *   score_algo_key: string,
 *   frontmatter_inclusions: import('./smart-entities.js').FrontmatterFilterEntry[],
 *   frontmatter_exclusions: import('./smart-entities.js').FrontmatterFilterEntry[],
 *   new_item: (item: ConnectionItem) => ConnectionsListScope,
 *   get: (key: string) => ConnectionsListScope|undefined,
 *   items: Object.<string, ConnectionsListScope>,
 *   item_type: new (env: import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>, data: ConnectionsListData) => ConnectionsListScope,
 *   set: (item: ConnectionsListScope) => void,
 *   constructor: {default_settings: ConnectionsListSettings},
 *   connections_list_component_settings_config?: import('./smart-environment.js').SettingsConfig,
 *   get_connections_list_component_options: () => Array<{value: string, name: string, description?: string}>,
 *   get_connections_list_item_options: () => Array<{value: string, name: string, description?: string}>
 * }} ConnectionsListsCollection
 */
export const ConnectionsListsCollection: {};
export type ConnectionsComponentModule = {
    display_name?: string;
    display_description?: string;
    settings_config?: import("./smart-environment.js").SettingsConfig | ((scope: ConnectionsListsCollection) => import("./smart-environment.js").SettingsConfig);
};
/**
 * @typedef {Object} ConnectionsComponentModule
 * @property {string} [display_name]
 * @property {string} [display_description]
 * @property {import('./smart-environment.js').SettingsConfig|((scope: ConnectionsListsCollection) => import('./smart-environment.js').SettingsConfig)} [settings_config]
 */
export const ConnectionsComponentModule: {};
export type ConnectionsActionModule = {
    action: ConnectionsAction;
    pre_process?: ConnectionsAction;
};
/**
 * @typedef {Object} ConnectionsActionModule
 * @property {ConnectionsAction} action
 * @property {ConnectionsAction} [pre_process]
 */
export const ConnectionsActionModule: {};
export type ConnectionsEnvConfig = {
    components: {
        [x: string]: ConnectionsComponentModule;
    };
    actions: {
        [x: string]: ConnectionsActionModule;
    };
    collections: {
        [x: string]: {
            settings_config: import("./smart-environment.js").SettingsConfig;
        };
    };
};
/**
 * @typedef {Object} ConnectionsEnvConfig
 * @property {Object.<string, ConnectionsComponentModule>} components
 * @property {Object.<string, ConnectionsActionModule>} actions
 * @property {Object.<string, {settings_config: import('./smart-environment.js').SettingsConfig}>} collections
 */
export const ConnectionsEnvConfig: {};
export type ConnectionsEventPayload = import("./smart-events.js").SmartEventPayload & {
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
 * @typedef {import('./smart-events.js').SmartEventPayload & {
 *   key?: string,
 *   keys?: string[],
 *   path?: string[],
 *   version?: string,
 *   elapsed_ms?: number,
 *   collection_key?: ConnectionsCollectionKey,
 *   item_key?: string,
 *   event_source?: string,
 *   source_key?: string,
 *   target_key?: string,
 *   link?: string,
 *   hide_mute_button?: boolean
 * }} ConnectionsEventPayload
 */
export const ConnectionsEventPayload: {};
export type ConnectionsEventDisposer = () => void;
export function ConnectionsEventDisposer(): void;
export type ConnectionsEvents = {
    emit: (event_key: string, payload?: ConnectionsEventPayload) => void;
    on: (event_key: string, callback: (payload: ConnectionsEventPayload) => void) => ConnectionsEventDisposer;
};
/**
 * @typedef {Object} ConnectionsEvents
 * @property {(event_key: string, payload?: ConnectionsEventPayload) => void} emit
 * @property {(event_key: string, callback: (payload: ConnectionsEventPayload) => void) => ConnectionsEventDisposer} on
 */
export const ConnectionsEvents: {};
export type ConnectionsComponentRenderer = {
    render_component: (component_key: string, scope: ConnectionsListScope | ConnectionResult | ConnectionsPlugin | ConnectionsItemViewScope | ConnectionsFooterViewScope | import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions> | ConnectionItem, opts?: ConnectionsComponentOptions) => Promise<HTMLElement | DocumentFragment>;
};
/**
 * @typedef {Object} ConnectionsComponentRenderer
 * @property {(component_key: string, scope: ConnectionsListScope|ConnectionResult|ConnectionsPlugin|ConnectionsItemViewScope|ConnectionsFooterViewScope|import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>|ConnectionItem, opts?: ConnectionsComponentOptions) => Promise<HTMLElement|DocumentFragment>} render_component
 */
export const ConnectionsComponentRenderer: {};
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
export type ConnectionsVaultAdapter = import("obsidian").VaultAdapter & {
    write: (path: string, data: string) => Promise<void>;
    mkdir: (path: string) => Promise<void>;
};
/**
 * @typedef {import('obsidian').VaultAdapter & {
 *   write: (path: string, data: string) => Promise<void>,
 *   mkdir: (path: string) => Promise<void>
 * }} ConnectionsVaultAdapter
 */
export const ConnectionsVaultAdapter: {};
export type ConnectionsVault = import("obsidian").Vault & {
    adapter: ConnectionsVaultAdapter;
    configDir: string;
};
/**
 * @typedef {import('obsidian').Vault & {
 *   adapter: ConnectionsVaultAdapter,
 *   configDir: string
 * }} ConnectionsVault
 */
export const ConnectionsVault: {};
export type ConnectionsCommandEntry = {
    id?: string;
    name?: string;
};
/**
 * @typedef {Object} ConnectionsCommandEntry
 * @property {string} [id]
 * @property {string} [name]
 */
export const ConnectionsCommandEntry: {};
export type ConnectionsCommandsRegistry = {
    commands: {
        [x: string]: ConnectionsCommandEntry;
    };
    executeCommandById: (command_id: string) => boolean;
};
/**
 * @typedef {Object} ConnectionsCommandsRegistry
 * @property {Object.<string, ConnectionsCommandEntry>} commands
 * @property {(command_id: string) => boolean} executeCommandById
 */
export const ConnectionsCommandsRegistry: {};
export type ConnectionsPluginsRegistry = {
    enabledPlugins: Set<string>;
    getPlugin?: (plugin_id: string) => ConnectionsPlugin | undefined;
    loadManifests: () => Promise<void> | void;
};
/**
 * @typedef {Object} ConnectionsPluginsRegistry
 * @property {Set<string>} enabledPlugins
 * @property {(plugin_id: string) => ConnectionsPlugin|undefined} [getPlugin]
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
export type ConnectionsEditor = import("obsidian").Editor;
/**
 * @typedef {import('obsidian').Editor} ConnectionsEditor
 */
export const ConnectionsEditor: {};
export type ConnectionsStateEffectValue<T> = import("@codemirror/state").StateEffect<T>;
/**
 * @typedef {import('@codemirror/state').StateEffect<T>} ConnectionsStateEffectValue
 * @template T
 */
export const ConnectionsStateEffectValue: {};
export type ConnectionsStateEffectType<T> = import("@codemirror/state").StateEffectType<T>;
/**
 * @typedef {import('@codemirror/state').StateEffectType<T>} ConnectionsStateEffectType
 * @template T
 */
export const ConnectionsStateEffectType: {};
export type ConnectionsEditorUpdate = import("@codemirror/view").ViewUpdate & {
    transactions: readonly import("@codemirror/state").Transaction[];
};
/**
 * @typedef {import('@codemirror/view').ViewUpdate & {
 *   transactions: readonly import('@codemirror/state').Transaction[]
 * }} ConnectionsEditorUpdate
 */
export const ConnectionsEditorUpdate: {};
export type ConnectionsEditorView = import("@codemirror/view").EditorView & {
    visibleRanges: readonly {
        from: number;
        to: number;
    }[];
    scrollDOM: HTMLElement;
};
/**
 * @typedef {import('@codemirror/view').EditorView & {
 *   visibleRanges: readonly {from: number, to: number}[],
 *   scrollDOM: HTMLElement
 * }} ConnectionsEditorView
 */
export const ConnectionsEditorView: {};
export type ConnectionsMarkdownView = import("obsidian").MarkdownView;
/**
 * @typedef {import('obsidian').MarkdownView} ConnectionsMarkdownView
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
export type ConnectionsWorkspaceLeaf = import("obsidian").WorkspaceLeaf & {
    parent?: ConnectionsWorkspaceParent | null;
};
/**
 * @typedef {import('obsidian').WorkspaceLeaf & {
 *   parent?: ConnectionsWorkspaceParent|null
 * }} ConnectionsWorkspaceLeaf
 */
export const ConnectionsWorkspaceLeaf: {};
export type ConnectionsWorkspace = import("obsidian").Workspace & {
    setActiveLeaf?: (leaf: ConnectionsWorkspaceLeaf, params?: {
        focus?: boolean;
    }) => void;
};
/**
 * @typedef {import('obsidian').Workspace & {
 *   setActiveLeaf?: (leaf: ConnectionsWorkspaceLeaf, params?: {focus?: boolean}) => void
 * }} ConnectionsWorkspace
 */
export const ConnectionsWorkspace: {};
export type ConnectionsApp = Omit<import("obsidian").App, "workspace" | "vault" | "plugins" | "commands" | "setting"> & {
    workspace: ConnectionsWorkspace;
    vault: ConnectionsVault;
    plugins: ConnectionsPluginsRegistry;
    commands: ConnectionsCommandsRegistry;
    setting: ConnectionsSettingsManager;
    loadLocalStorage?: (key: string) => string | null;
    saveLocalStorage?: (key: string, value: string) => void;
};
/**
 * @typedef {Omit<import('obsidian').App, 'workspace'|'vault'|'plugins'|'commands'|'setting'> & {
 *   workspace: ConnectionsWorkspace,
 *   vault: ConnectionsVault,
 *   plugins: ConnectionsPluginsRegistry,
 *   commands: ConnectionsCommandsRegistry,
 *   setting: ConnectionsSettingsManager,
 *   loadLocalStorage?: (key: string) => string|null,
 *   saveLocalStorage?: (key: string, value: string) => void
 * }} ConnectionsApp
 */
export const ConnectionsApp: {};
export type ConnectionsManifest = {
    id: string;
    name: string;
    version: string;
};
/**
 * @typedef {Object} ConnectionsManifest
 * @property {string} id
 * @property {string} name
 * @property {string} version
 */
export const ConnectionsManifest: {};
export type ConnectionsPlugin = Omit<import("obsidian").Plugin, "app" | "manifest" | "registerDomEvent" | "registerMarkdownCodeBlockProcessor"> & {
    app: ConnectionsApp;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    manifest: ConnectionsManifest;
    update_available?: boolean;
    latest_release_version?: string;
    connections_view_location_listener?: ConnectionsEventDisposer;
    connections_footer_view?: ConnectionsFooterViewScope;
    registerDomEvent: (element: HTMLElement, event_name: string, callback: (event: Event) => void) => void;
    registerEditorExtension: (extension: unknown) => void;
    registerMarkdownCodeBlockProcessor: (language: string, processor: (source: string, container: ConnectionsDomElement, context: ConnectionsMarkdownCodeBlockContext) => Promise<void> | void) => void;
    open_connections_view?: (params?: object) => unknown;
    _open_connections_view_base?: (...args: unknown[]) => unknown;
    open_note?: (target_path: string, event?: Event | null) => Promise<void> | void;
    get_editor_view: () => ConnectionsEditorView | null;
};
/**
 * @typedef {Omit<import('obsidian').Plugin, 'app'|'manifest'|'registerDomEvent'|'registerMarkdownCodeBlockProcessor'> & {
 *   app: ConnectionsApp,
 *   env: import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>,
 *   manifest: ConnectionsManifest,
 *   update_available?: boolean,
 *   latest_release_version?: string,
 *   connections_view_location_listener?: ConnectionsEventDisposer,
 *   connections_footer_view?: ConnectionsFooterViewScope,
 *   registerDomEvent: (element: HTMLElement, event_name: string, callback: (event: Event) => void) => void,
 *   registerEditorExtension: (extension: unknown) => void,
 *   registerMarkdownCodeBlockProcessor: (language: string, processor: (source: string, container: ConnectionsDomElement, context: ConnectionsMarkdownCodeBlockContext) => Promise<void>|void) => void,
 *   open_connections_view?: (params?: object) => unknown,
 *   _open_connections_view_base?: (...args: unknown[]) => unknown,
 *   open_note?: (target_path: string, event?: Event|null) => Promise<void>|void,
 *   get_editor_view: () => ConnectionsEditorView|null
 * }} ConnectionsPlugin
 */
export const ConnectionsPlugin: {};
/**
 * Connections-specific extension fields layered onto the canonical SmartEnv.
 */
export type ConnectionsEnvExtensions = {
    settings: ConnectionsRootSettings;
    config: ConnectionsEnvConfig;
    events: ConnectionsEvents;
    smart_sources: ConnectionsSourcesCollection;
    smart_blocks: ConnectionsCollection;
    connections_lists: ConnectionsListsCollection;
    smart_components: ConnectionsComponentRenderer;
    smart_contexts?: ConnectionsContextCollection;
    smart_view: ConnectionsComponentContext;
    plugin?: ConnectionsPlugin;
    main?: ConnectionsPlugin;
    smart_connections_plugin?: ConnectionsPlugin;
    obsidian_app?: ConnectionsApp;
    fs?: ConnectionsFs;
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
 * @property {ConnectionsEvents} events
 * @property {ConnectionsSourcesCollection} smart_sources
 * @property {ConnectionsCollection} smart_blocks
 * @property {ConnectionsListsCollection} connections_lists
 * @property {ConnectionsComponentRenderer} smart_components
 * @property {ConnectionsContextCollection} [smart_contexts]
 * @property {ConnectionsComponentContext} smart_view
 * @property {ConnectionsPlugin} [plugin]
 * @property {ConnectionsPlugin} [main]
 * @property {ConnectionsPlugin} [smart_connections_plugin]
 * @property {ConnectionsApp} [obsidian_app]
 * @property {ConnectionsFs} [fs]
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
export type ConnectionsItemViewScope = {
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
 * @typedef {Object} ConnectionsItemViewScope
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
export const ConnectionsItemViewScope: {};
export type ConnectionsFooterViewScope = {
    app: ConnectionsApp;
    plugin: ConnectionsPlugin;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    render_view: (params?: ConnectionsComponentOptions) => Promise<void> | void;
    container_map: {
        [x: string]: ConnectionsDomElement;
    };
    env_listeners?: ConnectionsEventDisposer[];
    _detach_visibility_guard: (() => void) | null;
    attach_visibility_guard: (editor_view: ConnectionsEditorView) => void;
    detach_visibility_guard: () => void;
    register_env_listener: (event_key: string, callback: (event: ConnectionsEventPayload) => void) => void;
    register_env_listeners: () => void;
    open_settings: () => Promise<void>;
    remove: () => void;
    unload: () => void;
};
/**
 * @typedef {Object} ConnectionsFooterViewScope
 * @property {ConnectionsApp} app
 * @property {ConnectionsPlugin} plugin
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {(params?: ConnectionsComponentOptions) => Promise<void>|void} render_view
 * @property {Object.<string, ConnectionsDomElement>} container_map
 * @property {ConnectionsEventDisposer[]} [env_listeners]
 * @property {(() => void)|null} _detach_visibility_guard
 * @property {(editor_view: ConnectionsEditorView) => void} attach_visibility_guard
 * @property {() => void} detach_visibility_guard
 * @property {(event_key: string, callback: (event: ConnectionsEventPayload) => void) => void} register_env_listener
 * @property {() => void} register_env_listeners
 * @property {() => Promise<void>} open_settings
 * @property {() => void} remove
 * @property {() => void} unload
 */
export const ConnectionsFooterViewScope: {};
export type ConnectionsSettingsTabScope = {
    plugin: ConnectionsPlugin;
    env: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    plugin_container: ConnectionsDomElement;
    turn_off_listener?: ConnectionsEventDisposer;
    render_header: (container: ConnectionsDomElement) => Promise<void>;
    render_plugin_settings: (container: ConnectionsDomElement) => Promise<void>;
    register_env_events: () => void;
};
/**
 * @typedef {Object} ConnectionsSettingsTabScope
 * @property {ConnectionsPlugin} plugin
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsDomElement} plugin_container
 * @property {ConnectionsEventDisposer} [turn_off_listener]
 * @property {(container: ConnectionsDomElement) => Promise<void>} render_header
 * @property {(container: ConnectionsDomElement) => Promise<void>} render_plugin_settings
 * @property {() => void} register_env_events
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
export type ConnectionsMarkdownCodeBlockContext = import("obsidian").MarkdownPostProcessorContext;
/**
 * @typedef {import('obsidian').MarkdownPostProcessorContext} ConnectionsMarkdownCodeBlockContext
 */
export const ConnectionsMarkdownCodeBlockContext: {};
export type ConnectionsComponentContext = {
    create_doc_fragment: (html: string) => DocumentFragment;
    apply_style_sheet: (css_text: string) => void;
    get_icon_html: (icon_name: string) => string;
    empty: (container: Element | DocumentFragment | null) => void;
    attach_disposer: (container: ConnectionsDomElement, disposers: Array<() => void>) => void;
    safe_inner_html: (element: Element, html: string) => void;
    render_markdown: (markdown: string, scope?: object | null) => Promise<DocumentFragment>;
};
/**
 * @typedef {Object} ConnectionsComponentContext
 * @property {(html: string) => DocumentFragment} create_doc_fragment
 * @property {(css_text: string) => void} apply_style_sheet
 * @property {(icon_name: string) => string} get_icon_html
 * @property {(container: Element|DocumentFragment|null) => void} empty
 * @property {(container: ConnectionsDomElement, disposers: Array<() => void>) => void} attach_disposer
 * @property {(element: Element, html: string) => void} safe_inner_html
 * @property {(markdown: string, scope?: object|null) => Promise<DocumentFragment>} render_markdown
 */
export const ConnectionsComponentContext: {};
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
export type ConnectionsMenuItem = import("obsidian").MenuItem & {
    setSubmenu: () => ConnectionsMenu;
};
/**
 * @typedef {import('obsidian').MenuItem & {
 *   setSubmenu: () => ConnectionsMenu
 * }} ConnectionsMenuItem
 */
export const ConnectionsMenuItem: {};
export type ConnectionsMenu = Omit<import("obsidian").Menu, "addItem"> & {
    items?: ConnectionsMenuItem[];
    addItem: (callback: (item: ConnectionsMenuItem) => unknown) => ConnectionsMenu;
    addSeparator: () => ConnectionsMenu;
    showAtPosition?: (position: {
        x: number;
        y: number;
    }) => void;
};
/**
 * @typedef {Omit<import('obsidian').Menu, 'addItem'> & {
 *   items?: ConnectionsMenuItem[],
 *   addItem: (callback: (item: ConnectionsMenuItem) => unknown) => ConnectionsMenu,
 *   addSeparator: () => ConnectionsMenu,
 *   showAtPosition?: (position: {x: number, y: number}) => void
 * }} ConnectionsMenu
 */
export const ConnectionsMenu: {};
export type ConnectionsActionParams = {
    to?: string;
    env?: import("./smart-environment.js").SmartEnv<ConnectionsEnvExtensions>;
    plugin?: ConnectionsPlugin;
    app?: ConnectionsApp;
    workspace?: ConnectionsWorkspace;
    editor?: ConnectionsEditor;
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
 * @property {ConnectionsEditor} [editor]
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
    editor?: ConnectionsEditor;
    params: ConnectionsActionParams;
};
/**
 * @typedef {Object} ConnectionsActionRegistrationContext
 * @property {ConnectionsPlugin} plugin
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsApp} app
 * @property {ConnectionsEditor} [editor]
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
export type ConnectionsRequestResponse<T> = {
    json: T;
    text: string;
};
/**
 * @template T
 * @typedef {Object} ConnectionsRequestResponse
 * @property {T} json
 * @property {string} text
 */
export const ConnectionsRequestResponse: {};
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
