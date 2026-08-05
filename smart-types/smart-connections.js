/**
 * @typedef {'smart_sources'|'smart_blocks'} ConnectionsCollectionKey
 */
export const ConnectionsCollectionKey = '';

/**
 * @typedef {Object} ConnectionsStateEntry
 * @property {number|null} [hidden] - Timestamp indicating the result is hidden.
 * @property {number|null} [pinned] - Timestamp indicating the result is pinned.
 */
export const ConnectionsStateEntry = {};

/**
 * @typedef {Object.<string, ConnectionsStateEntry>} ConnectionsState
 */
export const ConnectionsState = {};

/**
 * @typedef {Object} ConnectionsComponentSettings
 * @property {boolean} [render_markdown]
 * @property {boolean} [show_full_path]
 */
export const ConnectionsComponentSettings = {};

/**
 * @typedef {Object} ConnectionsComponentSettingsMap
 * @property {ConnectionsComponentSettings} [connections_list_v4]
 * @property {ConnectionsComponentSettings} [connections_list_v3]
 * @property {ConnectionsComponentSettings} [connections_list_item_v3]
 */
export const ConnectionsComponentSettingsMap = {};

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
export const ConnectionsListSettings = {};

/**
 * @typedef {Object} LegacyConnectionsSettings
 * @property {boolean} [inline_connections]
 * @property {number} [inline_connections_score_threshold]
 * @property {boolean} [footer_connections]
 * @property {string} [rank_model]
 */
export const LegacyConnectionsSettings = {};

/**
 * @typedef {Object} ConnectionsRootSettings
 * @property {LegacyConnectionsSettings} [connections_pro]
 * @property {ConnectionsListSettings} [connections_lists]
 */
export const ConnectionsRootSettings = {};

/**
 * @typedef {import('./smart-entities.js').SmartEntityData & import('./smart-sources.js').SmartSourceData & import('./smart-blocks.js').SmartBlockData & {
 *   collection_key?: ConnectionsCollectionKey,
 *   item_key?: string,
 *   connections?: ConnectionsState,
 *   hidden_connections?: Object.<string, number|null|undefined>,
 *   connections_list_component_key?: string
 * }} ConnectionsItemData
 */
export const ConnectionsItemData = {};

/**
 * @typedef {Object} ConnectionsFilter
 * @property {string[]} [exclude_keys]
 * @property {string[]} [exclude_key_starts_with_any]
 * @property {string[]} [exclude_key_ends_with_any]
 * @property {import('./smart-entities.js').FrontmatterFilter} [frontmatter]
 */
export const ConnectionsFilter = {};

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
export const ConnectionsQueryParams = {};

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
export const ConnectionResult = {};

/**
 * @callback ConnectionScoreFunction
 * @param {ConnectionsQueryParams} [params]
 * @returns {Partial<ConnectionResult>|null|undefined}
 */
export const ConnectionScoreFunction = function () {};

/**
 * @typedef {import('obsidian').TFile} ConnectionsFile
 */
export const ConnectionsFile = {};

/**
 * @typedef {Object} ConnectionsFs
 * @property {string[]} [file_paths]
 * @property {string[]} [folder_paths]
 * @property {string} [base_path]
 */
export const ConnectionsFs = {};

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
export const ConnectionItem = {};

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
export const ConnectionsCollection = {};

/**
 * @typedef {ConnectionsCollection & {
 *   init_file_path: (path: string) => ConnectionItem|undefined
 * }} ConnectionsSourcesCollection
 */
export const ConnectionsSourcesCollection = {};

/**
 * @typedef {Object} ConnectionsListData
 * @property {ConnectionsCollectionKey} collection_key
 * @property {string} item_key
 * @property {string} [connections_list_component_key]
 */
export const ConnectionsListData = {};

/**
 * @callback ConnectionsAction
 * @param {...unknown} args
 * @returns {unknown|Promise<unknown>}
 */
export const ConnectionsAction = function () {};

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
export const ConnectionsActions = {};

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
export const ConnectionsListScope = {};

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
export const ConnectionsListsCollection = {};

/**
 * @typedef {Object} ConnectionsComponentModule
 * @property {string} [display_name]
 * @property {string} [display_description]
 * @property {import('./smart-environment.js').SettingsConfig|((scope: ConnectionsListsCollection) => import('./smart-environment.js').SettingsConfig)} [settings_config]
 */
export const ConnectionsComponentModule = {};

/**
 * @typedef {Object} ConnectionsActionModule
 * @property {ConnectionsAction} action
 * @property {ConnectionsAction} [pre_process]
 */
export const ConnectionsActionModule = {};

/**
 * @typedef {Object} ConnectionsEnvConfig
 * @property {Object.<string, ConnectionsComponentModule>} components
 * @property {Object.<string, ConnectionsActionModule>} actions
 * @property {Object.<string, {settings_config: import('./smart-environment.js').SettingsConfig}>} collections
 */
export const ConnectionsEnvConfig = {};

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
export const ConnectionsEventPayload = {};

/**
 * @callback ConnectionsEventDisposer
 * @returns {void}
 */
export const ConnectionsEventDisposer = function () {};

/**
 * @typedef {Object} ConnectionsEvents
 * @property {(event_key: string, payload?: ConnectionsEventPayload) => void} emit
 * @property {(event_key: string, callback: (payload: ConnectionsEventPayload) => void) => ConnectionsEventDisposer} on
 */
export const ConnectionsEvents = {};

/**
 * @typedef {Object} ConnectionsComponentRenderer
 * @property {(component_key: string, scope: ConnectionsListScope|ConnectionResult|ConnectionsPlugin|ConnectionsItemViewScope|ConnectionsFooterViewScope|import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>|ConnectionItem, opts?: ConnectionsComponentOptions) => Promise<HTMLElement|DocumentFragment>} render_component
 */
export const ConnectionsComponentRenderer = {};

/**
 * @typedef {Object} ConnectionsContextCollection
 * @property {(items: Array<{key: string, score: number}>, opts?: object) => unknown} [add_items]
 */
export const ConnectionsContextCollection = {};

/**
 * @typedef {import('obsidian').VaultAdapter & {
 *   write: (path: string, data: string) => Promise<void>,
 *   mkdir: (path: string) => Promise<void>
 * }} ConnectionsVaultAdapter
 */
export const ConnectionsVaultAdapter = {};

/**
 * @typedef {import('obsidian').Vault & {
 *   adapter: ConnectionsVaultAdapter,
 *   configDir: string
 * }} ConnectionsVault
 */
export const ConnectionsVault = {};

/**
 * @typedef {Object} ConnectionsCommandEntry
 * @property {string} [id]
 * @property {string} [name]
 */
export const ConnectionsCommandEntry = {};

/**
 * @typedef {Object} ConnectionsCommandsRegistry
 * @property {Object.<string, ConnectionsCommandEntry>} commands
 * @property {(command_id: string) => boolean} executeCommandById
 */
export const ConnectionsCommandsRegistry = {};

/**
 * @typedef {Object} ConnectionsPluginsRegistry
 * @property {Set<string>} enabledPlugins
 * @property {(plugin_id: string) => ConnectionsPlugin|undefined} [getPlugin]
 * @property {() => Promise<void>|void} loadManifests
 */
export const ConnectionsPluginsRegistry = {};

/**
 * @typedef {Object} ConnectionsSettingsManager
 * @property {() => Promise<void>|void} open
 * @property {(plugin_id: string) => Promise<void>|void} openTabById
 */
export const ConnectionsSettingsManager = {};

/**
 * @typedef {import('obsidian').Editor} ConnectionsEditor
 */
export const ConnectionsEditor = {};

/**
 * @typedef {import('@codemirror/state').StateEffect<T>} ConnectionsStateEffectValue
 * @template T
 */
export const ConnectionsStateEffectValue = {};

/**
 * @typedef {import('@codemirror/state').StateEffectType<T>} ConnectionsStateEffectType
 * @template T
 */
export const ConnectionsStateEffectType = {};

/**
 * @typedef {import('@codemirror/view').ViewUpdate & {
 *   transactions: readonly import('@codemirror/state').Transaction[]
 * }} ConnectionsEditorUpdate
 */
export const ConnectionsEditorUpdate = {};

/**
 * @typedef {import('@codemirror/view').EditorView & {
 *   visibleRanges: readonly {from: number, to: number}[],
 *   scrollDOM: HTMLElement
 * }} ConnectionsEditorView
 */
export const ConnectionsEditorView = {};

/**
 * @typedef {import('obsidian').MarkdownView} ConnectionsMarkdownView
 */
export const ConnectionsMarkdownView = {};

/**
 * @typedef {Object} ConnectionsWorkspaceParent
 * @property {ConnectionsWorkspaceParent|null} [parent]
 * @property {boolean} [collapsed]
 * @property {(collapsed?: boolean) => void} [setCollapsed]
 * @property {() => void} [expand]
 * @property {() => void} [toggle]
 */
export const ConnectionsWorkspaceParent = {};

/**
 * @typedef {import('obsidian').WorkspaceLeaf & {
 *   parent?: ConnectionsWorkspaceParent|null
 * }} ConnectionsWorkspaceLeaf
 */
export const ConnectionsWorkspaceLeaf = {};

/**
 * @typedef {import('obsidian').Workspace & {
 *   setActiveLeaf?: (leaf: ConnectionsWorkspaceLeaf, params?: {focus?: boolean}) => void
 * }} ConnectionsWorkspace
 */
export const ConnectionsWorkspace = {};

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
export const ConnectionsApp = {};

/**
 * @typedef {Object} ConnectionsManifest
 * @property {string} id
 * @property {string} name
 * @property {string} version
 */
export const ConnectionsManifest = {};

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
export const ConnectionsPlugin = {};

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
export const ConnectionsEnvExtensions = {};

/**
 * @typedef {Object} ConnectionsPauseControls
 * @property {(paused: boolean) => void} update
 */
export const ConnectionsPauseControls = {};

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
export const ConnectionsItemViewScope = {};

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
export const ConnectionsFooterViewScope = {};


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
export const ConnectionsSettingsTabScope = {};

/**
 * @typedef {HTMLElement & {
 *   _has_listeners?: boolean,
 *   _connections_menu_state?: ConnectionsMenuState
 * }} ConnectionsViewElement
 */
export const ConnectionsViewElement = {};


/**
 * @typedef {HTMLElement & {
 *   _has_listeners?: boolean
 * }} ConnectionsDomElement
 */
export const ConnectionsDomElement = {};

/**
 * @typedef {import('obsidian').MarkdownPostProcessorContext} ConnectionsMarkdownCodeBlockContext
 */
export const ConnectionsMarkdownCodeBlockContext = {};

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
export const ConnectionsComponentContext = {};

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
export const ConnectionsComponentOptions = {};

/**
 * @typedef {Object} ConnectionsMenuState
 * @property {ConnectionsItemViewScope} view
 * @property {ConnectionsViewElement} container
 * @property {ConnectionsListScope} connections_list
 * @property {ConnectionsListSettings} [connections_settings]
 */
export const ConnectionsMenuState = {};

/**
 * @typedef {import('obsidian').MenuItem & {
 *   setSubmenu: () => ConnectionsMenu
 * }} ConnectionsMenuItem
 */
export const ConnectionsMenuItem = {};

/**
 * @typedef {Omit<import('obsidian').Menu, 'addItem'> & {
 *   items?: ConnectionsMenuItem[],
 *   addItem: (callback: (item: ConnectionsMenuItem) => unknown) => ConnectionsMenu,
 *   addSeparator: () => ConnectionsMenu,
 *   showAtPosition?: (position: {x: number, y: number}) => void
 * }} ConnectionsMenu
 */
export const ConnectionsMenu = {};

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
export const ConnectionsActionParams = {};

/**
 * @typedef {Object} ConnectionsActionRegistrationContext
 * @property {ConnectionsPlugin} plugin
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsApp} app
 * @property {ConnectionsEditor} [editor]
 * @property {ConnectionsActionParams} params
 */
export const ConnectionsActionRegistrationContext = {};

/**
 * @typedef {Object} ConnectionsCommandConfig
 * @property {string} name
 * @property {string} [context]
 * @property {(context: ConnectionsActionRegistrationContext) => boolean} [register_when]
 * @property {(context: ConnectionsActionRegistrationContext) => ConnectionsActionParams} [params]
 * @property {(context: ConnectionsActionRegistrationContext) => boolean} [when]
 * @property {(context: ConnectionsActionRegistrationContext) => object} [get_scope]
 */
export const ConnectionsCommandConfig = {};

/**
 * @typedef {Object.<string, ConnectionsCommandConfig>} ConnectionsCommandsConfig
 */
export const ConnectionsCommandsConfig = {};

/**
 * @typedef {Object} ConnectionsRibbonConfig
 * @property {string} icon_name
 * @property {string} description
 * @property {(context: ConnectionsActionRegistrationContext) => boolean} [register_when]
 * @property {(context: ConnectionsActionRegistrationContext) => object} [get_scope]
 * @property {(context: ConnectionsActionRegistrationContext) => ConnectionsActionParams} [params]
 */
export const ConnectionsRibbonConfig = {};

/**
 * @typedef {Object.<string, ConnectionsRibbonConfig>} ConnectionsRibbonConfigMap
 */
export const ConnectionsRibbonConfigMap = {};


/**
 * @typedef {Object} ConnectionsMenuContext
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsMenu} menu
 * @property {ConnectionsActionParams} params
 * @property {ConnectionsListScope|ConnectionsListsCollection|ConnectionsItemViewScope|ConnectionItem} scope
 * @property {string} [event_source]
 * @property {() => ConnectionsAction|undefined} [resolve_action]
 */
export const ConnectionsMenuContext = {};

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
export const ConnectionsMenuConfig = {};

/**
 * @typedef {Object.<string, ConnectionsMenuConfig>} ConnectionsMenusConfig
 */
export const ConnectionsMenusConfig = {};

/**
 * @typedef {Object} ConnectionsReleaseAsset
 * @property {string} name
 * @property {string} browser_download_url
 */
export const ConnectionsReleaseAsset = {};

/**
 * @typedef {Object} ConnectionsReleaseResponse
 * @property {string} tag_name
 * @property {ConnectionsReleaseAsset[]} assets
 */
export const ConnectionsReleaseResponse = {};

/**
 * @template T
 * @typedef {Object} ConnectionsRequestResponse
 * @property {T} json
 * @property {string} text
 */
export const ConnectionsRequestResponse = {};

/**
 * @typedef {Object} ConnectionsGraphResultEventDetail
 * @property {string} collection_key
 * @property {string} item_key
 */
export const ConnectionsGraphResultEventDetail = {};
