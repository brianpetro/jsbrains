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
 * @property {number|null} score
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
 * @typedef {Object} ConnectionsFile
 * @property {string} path
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
 * @property {ConnectionsEnv} env
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
 * @property {ConnectionsEnv} env
 * @property {ConnectionsFs} [fs]
 * @property {ConnectionsListSettings} settings
 * @property {(key: string) => ConnectionItem|undefined} get
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
 * @property {ConnectionsEnv} env
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
 * @typedef {ConnectionsCollection & {
 *   settings: ConnectionsListSettings,
 *   results_collection_key: ConnectionsCollectionKey,
 *   score_algo_key: string,
 *   frontmatter_inclusions: import('./smart-entities.js').FrontmatterFilterEntry[],
 *   frontmatter_exclusions: import('./smart-entities.js').FrontmatterFilterEntry[],
 *   new_item: (item: ConnectionItem) => ConnectionsListScope,
 *   get: (key: string) => ConnectionsListScope|undefined,
 *   items: Object.<string, ConnectionsListScope>,
 *   item_type: new (env: ConnectionsEnv, data: ConnectionsListData) => ConnectionsListScope,
 *   constructor: {default_settings: ConnectionsListSettings},
 *   connections_list_component_settings_config?: import('./smart-environment.js').SettingsConfig
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
 *   event_source?: string
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
 * @property {(component_key: string, scope: ConnectionsListScope|ConnectionResult|ConnectionsPlugin|ConnectionsItemViewScope|ConnectionsFooterViewScope|ConnectionsEnv|ConnectionItem, opts?: ConnectionsComponentOptions) => Promise<HTMLElement|DocumentFragment>} render_component
 */
export const ConnectionsComponentRenderer = {};

/**
 * @typedef {Object} ConnectionsContextCollection
 * @property {(items: Array<{key: string, score: number}>, opts?: object) => unknown} [add_items]
 */
export const ConnectionsContextCollection = {};

/**
 * @typedef {Object} ConnectionsVaultAdapter
 * @property {(path: string) => Promise<boolean>} exists
 * @property {(path: string) => Promise<void>} mkdir
 * @property {(path: string, data: string) => Promise<void>} write
 * @property {(path: string) => Promise<string>} read
 * @property {(path: string, data: string) => Promise<void>} append
 */
export const ConnectionsVaultAdapter = {};

/**
 * @typedef {Object} ConnectionsVault
 * @property {ConnectionsVaultAdapter} adapter
 * @property {string} configDir
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
 * @typedef {Object} ConnectionsEditor
 * @property {(text: string) => void} replaceSelection
 * @property {ConnectionsEditorView} [cm]
 */
export const ConnectionsEditor = {};

/**
 * @typedef {Object} ConnectionsEditorLine
 * @property {number} from
 * @property {number} to
 */
export const ConnectionsEditorLine = {};

/**
 * @typedef {Object} ConnectionsEditorDoc
 * @property {number} lines
 * @property {(line_number: number) => ConnectionsEditorLine} line
 */
export const ConnectionsEditorDoc = {};

/**
 * @typedef {Object} ConnectionsEditorState
 * @property {ConnectionsEditorDoc} doc
 */
export const ConnectionsEditorState = {};

/**
 * @typedef {Object} ConnectionsEditorRange
 * @property {number} from
 * @property {number} to
 */
export const ConnectionsEditorRange = {};

/**
 * @template T
 * @typedef {Object} ConnectionsStateEffectValue
 * @property {T} value
 * @property {(effect_type: ConnectionsStateEffectType<T>) => boolean} is
 */
export const ConnectionsStateEffectValue = {};

/**
 * @template T
 * @typedef {Object} ConnectionsStateEffectType
 * @property {(value: T) => ConnectionsStateEffectValue<T>} of
 */
export const ConnectionsStateEffectType = {};

/**
 * @typedef {Object} ConnectionsEditorTransaction
 * @property {ConnectionsStateEffectValue<HTMLElement|null>[]} effects
 */
export const ConnectionsEditorTransaction = {};

/**
 * @typedef {Object} ConnectionsEditorUpdate
 * @property {ConnectionsEditorTransaction[]} transactions
 */
export const ConnectionsEditorUpdate = {};

/**
 * @typedef {Object} ConnectionsEditorView
 * @property {ConnectionsEditorState} state
 * @property {ConnectionsEditorRange[]} visibleRanges
 * @property {HTMLElement} scrollDOM
 * @property {HTMLElement} dom
 * @property {(transaction: {effects: ConnectionsStateEffectValue<HTMLElement|null>[]}) => void} dispatch
 */
export const ConnectionsEditorView = {};

/**
 * @typedef {Object} ConnectionsMarkdownView
 * @property {ConnectionsEditor} [editor]
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
 * @typedef {Object} ConnectionsWorkspaceLeaf
 * @property {ConnectionsWorkspaceParent|null} [parent]
 * @property {ConnectionsItemViewScope|object} view
 * @property {() => void} detach
 * @property {(state: object) => Promise<void>|void} [setViewState]
 */
export const ConnectionsWorkspaceLeaf = {};

/**
 * @typedef {Object} ConnectionsWorkspace
 * @property {ConnectionsWorkspaceParent} leftSplit
 * @property {ConnectionsWorkspaceParent} rightSplit
 * @property {(callback: () => void) => void} onLayoutReady
 * @property {() => ConnectionsFile|null} getActiveFile
 * @property {() => ConnectionsMarkdownView|null} getActiveFileView
 * @property {(type: string) => ConnectionsWorkspaceLeaf[]} getLeavesOfType
 * @property {(leaf: ConnectionsWorkspaceLeaf) => Promise<void>|void} revealLeaf
 * @property {(leaf: ConnectionsWorkspaceLeaf, opts?: object) => void} [setActiveLeaf]
 * @property {(location?: boolean|string) => ConnectionsWorkspaceLeaf} [getLeaf]
 * @property {(create?: boolean) => ConnectionsWorkspaceLeaf} [getLeftLeaf]
 * @property {(create?: boolean) => ConnectionsWorkspaceLeaf} [getRightLeaf]
 */
export const ConnectionsWorkspace = {};

/**
 * @typedef {Object} ConnectionsApp
 * @property {ConnectionsWorkspace} workspace
 * @property {ConnectionsVault} vault
 * @property {ConnectionsPluginsRegistry} plugins
 * @property {ConnectionsCommandsRegistry} commands
 * @property {ConnectionsSettingsManager} setting
 * @property {(key: string) => string|null} [loadLocalStorage]
 * @property {(key: string, value: string) => void} [saveLocalStorage]
 */
export const ConnectionsApp = {};

/**
 * @typedef {Object} ConnectionsManifest
 * @property {string} id
 * @property {string} version
 */
export const ConnectionsManifest = {};

/**
 * @typedef {Object} ConnectionsPlugin
 * @property {ConnectionsApp} app
 * @property {ConnectionsEnv} env
 * @property {ConnectionsManifest} manifest
 * @property {boolean} [update_available]
 * @property {string} [latest_release_version]
 * @property {ConnectionsEventDisposer} [connections_view_location_listener]
 * @property {ConnectionsFooterViewScope} [connections_footer_view]
 * @property {(element: HTMLElement, event_name: string, callback: (event: Event) => void) => void} registerDomEvent
 * @property {(extension: unknown) => void} registerEditorExtension
 * @property {(language: string, processor: (source: string, container: ConnectionsDomElement, context: ConnectionsMarkdownCodeBlockContext) => Promise<void>|void) => void} registerMarkdownCodeBlockProcessor
 * @property {(tab: object) => void} addSettingTab
 * @property {(params?: object) => unknown} [open_connections_view]
 * @property {(params?: object) => unknown} [_open_connections_view_base]
 * @property {(target_path: string, event?: Event|null) => Promise<void>|void} [open_note]
 * @property {() => ConnectionsEditorView|null} get_editor_view
 */
export const ConnectionsPlugin = {};

/**
 * @typedef {Object} ConnectionsEnv
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
 * @property {string} [state]
 * @property {{settings?: {native_notice_attention?: boolean}}} [event_logs]
 * @property {{_loaded?: boolean}} [smart_graph_plugin]
 * @property {(menu_key: string, menu: ConnectionsMenu, scope: object, params?: ConnectionsActionParams) => void} [build_menu]
 * @property {(target: object) => void} [create_env_getter]
 * @property {(main: object) => void} [unload_main]
 */
export const ConnectionsEnv = {};

/**
 * @typedef {Object} ConnectionsPauseControls
 * @property {(paused: boolean) => void} update
 */
export const ConnectionsPauseControls = {};

/**
 * @typedef {Object} ConnectionsItemViewScope
 * @property {ConnectionsApp} app
 * @property {ConnectionsPlugin} plugin
 * @property {ConnectionsEnv} env
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
 * @property {ConnectionsEnv} env
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
 * @property {ConnectionsEnv} env
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
 *   createDiv: (options?: object|string) => ConnectionsDomElement,
 *   createEl: (tag: string, options?: object|string) => ConnectionsDomElement,
 *   empty: () => void,
 *   setText: (text: string) => void,
 *   _has_listeners?: boolean
 * }} ConnectionsDomElement
 */
export const ConnectionsDomElement = {};

/**
 * @typedef {Object} ConnectionsMarkdownCodeBlockContext
 * @property {string} sourcePath
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
 * @typedef {Object} ConnectionsMenuItem
 * @property {(title: string) => ConnectionsMenuItem} setTitle
 * @property {(icon: string) => ConnectionsMenuItem} setIcon
 * @property {(disabled: boolean) => ConnectionsMenuItem} setDisabled
 * @property {(callback: () => unknown|Promise<unknown>) => ConnectionsMenuItem} onClick
 * @property {() => ConnectionsMenu} setSubmenu
 */
export const ConnectionsMenuItem = {};

/**
 * @typedef {Object} ConnectionsMenu
 * @property {ConnectionsMenuItem[]} [items]
 * @property {(callback: (item: ConnectionsMenuItem) => void) => ConnectionsMenu} addItem
 * @property {() => ConnectionsMenu} addSeparator
 * @property {(event: MouseEvent|Event) => void} showAtMouseEvent
 * @property {(position: {x: number, y: number}) => void} [showAtPosition]
 */
export const ConnectionsMenu = {};

/**
 * @typedef {Object} ConnectionsActionParams
 * @property {string} [to]
 * @property {ConnectionsEnv} [env]
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
 */
export const ConnectionsActionParams = {};

/**
 * @typedef {Object} ConnectionsActionRegistrationContext
 * @property {ConnectionsPlugin} plugin
 * @property {ConnectionsEnv} env
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
 */
export const ConnectionsRibbonConfig = {};

/**
 * @typedef {Object.<string, ConnectionsRibbonConfig>} ConnectionsRibbonConfigMap
 */
export const ConnectionsRibbonConfigMap = {};

/**
 * @typedef {Object} ConnectionsMenuContext
 * @property {ConnectionsEnv} env
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
 * @property {((this: ConnectionsMenuContext, event?: Event) => ConnectionsActionParams)} [params]
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
