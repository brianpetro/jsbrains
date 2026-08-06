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
 * @typedef {Object} ConnectionsFilterOverrides
 * @property {import('./smart-entities.js').FrontmatterFilter} [frontmatter]
 */
export const ConnectionsFilterOverrides = {};

/**
 * @typedef {Omit<
 *   import('./smart-collections.js').CollectionFilterOptions,
 *   keyof ConnectionsFilterOverrides
 * > & ConnectionsFilterOverrides} ConnectionsFilter
 */
export const ConnectionsFilter = {};

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
export const ConnectionsQueryParamsOverrides = {};

/**
 * @typedef {Omit<
 *   import('./smart-collections.js').CollectionScoreParams<ConnectionsFilter>,
 *   keyof ConnectionsQueryParamsOverrides
 * > & ConnectionsQueryParamsOverrides} ConnectionsQueryParams
 */
export const ConnectionsQueryParams = {};

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
export const ConnectionResultOverrides = {};

/**
 * @typedef {Omit<
 *   import('./smart-collections.js').CollectionScoreResult<unknown, ConnectionsItemData, number|null>,
 *   keyof ConnectionResultOverrides
 * > & ConnectionResultOverrides} ConnectionResult
 */
export const ConnectionResult = {};

/**
 * @callback ConnectionScoreFunction
 * @param {ConnectionsQueryParams} [params]
 * @returns {Partial<ConnectionResult>|null|undefined}
 */
export const ConnectionScoreFunction = function () {};

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
 * @property {ConnectionsFile} [file]
 * @property {string} [embed_link]
 * @property {boolean} [is_media]
 * @property {boolean} [should_embed]
 * @property {ConnectionScoreFunction} [score]
 * @property {(params?: ConnectionsQueryParams) => ConnectionResult|null|undefined} filter_and_score
 * @property {() => Promise<string>} read
 * @property {() => void} queue_import
 */
export const ConnectionItemOverrides = {};

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
export const ConnectionItem = {};

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
export const ConnectionsCollectionOverrides = {};

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
export const ConnectionsCollection = {};

/**
 * @typedef {Object} ConnectionsSourcesCollectionOverrides
 * @property {(path: string) => ConnectionItem|undefined} init_file_path
 */
export const ConnectionsSourcesCollectionOverrides = {};

/**
 * @typedef {Omit<ConnectionsCollection, keyof ConnectionsSourcesCollectionOverrides> & ConnectionsSourcesCollectionOverrides} ConnectionsSourcesCollection
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
export const ConnectionsListScopeOverrides = {};

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
export const ConnectionsListScope = {};

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
export const ConnectionsListsCollectionOverrides = {};

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
export const ConnectionsListsCollection = {};

/**
 * @typedef {Object} ConnectionsComponentModuleOverrides
 * @property {import('./smart-environment.js').SettingsConfig|((scope: ConnectionsListsCollection) => import('./smart-environment.js').SettingsConfig)} [settings_config]
 */
export const ConnectionsComponentModuleOverrides = {};

/**
 * @typedef {Omit<
 *   import('./smart-components.js').SmartEnvComponentConfig,
 *   keyof ConnectionsComponentModuleOverrides
 * > & ConnectionsComponentModuleOverrides} ConnectionsComponentModule
 */
export const ConnectionsComponentModule = {};

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
export const ConnectionsActionModuleOverrides = {};

/**
 * @typedef {Omit<
 *   import('./smart-environment.js').SmartEnvActionConfig,
 *   keyof ConnectionsActionModuleOverrides
 * > & ConnectionsActionModuleOverrides} ConnectionsActionModule
 */
export const ConnectionsActionModule = {};

/**
 * @typedef {Object} ConnectionsEnvConfigOverrides
 * @property {Object.<string, ConnectionsComponentModule>} components
 * @property {Object.<string, ConnectionsActionModule>} actions
 * @property {Object.<string, import('./smart-environment.js').SmartEnvCollectionDefinition> & {connections_lists: import('./smart-environment.js').SmartEnvCollectionConfig}} collections
 */
export const ConnectionsEnvConfigOverrides = {};

/**
 * @typedef {Omit<
 *   import('./smart-environment.js').SmartEnvConfig,
 *   keyof ConnectionsEnvConfigOverrides
 * > & ConnectionsEnvConfigOverrides} ConnectionsEnvConfig
 */
export const ConnectionsEnvConfig = {};

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
export const ConnectionsEventPayloadOverrides = {};

/**
 * @typedef {Omit<
 *   import('./smart-events.js').SmartEventPayload,
 *   keyof ConnectionsEventPayloadOverrides
 * > & ConnectionsEventPayloadOverrides} ConnectionsEventPayload
 */
export const ConnectionsEventPayload = {};

/**
 * @typedef {Object} ConnectionsContextCollection
 * @property {(items: Array<{key: string, score: number}>, opts?: object) => unknown} [add_items]
 */
export const ConnectionsContextCollection = {};

/**
 * @typedef {Object} ConnectionsCommandsRegistry
 * @property {Object.<string, {name?: string}>} commands
 * @property {(command_id: string) => boolean} executeCommandById
 */
export const ConnectionsCommandsRegistry = {};

/**
 * @typedef {Object} ConnectionsPluginsRegistry
 * @property {Set<string>} enabledPlugins
 * @property {(plugin_id: string) => ConnectionsPlugin|undefined} getPlugin
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
 * @typedef {Object} ConnectionsEditorView
 * @property {{doc: ConnectionsEditorDoc}} state
 * @property {ConnectionsEditorLine[]} visibleRanges
 * @property {HTMLElement} scrollDOM
 * @property {HTMLElement} dom
 * @property {(transaction: {effects: unknown[]}) => void} dispatch
 */
export const ConnectionsEditorView = {};

/**
 * @typedef {Object} ConnectionsEditor
 * @property {(text: string) => void} replaceSelection
 * @property {ConnectionsEditorView} [cm]
 */
export const ConnectionsEditor = {};

/**
 * @typedef {Object} ConnectionsMarkdownView
 * @property {ConnectionsEditor} editor
 */
export const ConnectionsMarkdownView = {};

/**
 * @typedef {Object} ConnectionsFile
 * @property {string} path
 */
export const ConnectionsFile = {};

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
 * @typedef {Object} ConnectionsWorkspaceLeafOverrides
 * @property {ConnectionsWorkspaceParent|null} [parent]
 * @property {ConnectionsItemViewScope} [view]
 * @property {() => void} detach
 * @property {(state: Object.<string, unknown>) => Promise<void>|void} [setViewState]
 */
export const ConnectionsWorkspaceLeafOverrides = {};

/**
 * @typedef {ConnectionsWorkspaceLeafOverrides} ConnectionsWorkspaceLeaf
 */
export const ConnectionsWorkspaceLeaf = {};

/**
 * @typedef {Object} ConnectionsWorkspaceOverrides
 * @property {ConnectionsWorkspaceParent|null} [leftSplit]
 * @property {ConnectionsWorkspaceParent|null} [rightSplit]
 * @property {(callback: () => void) => void} onLayoutReady
 * @property {() => ConnectionsFile|null} getActiveFile
 * @property {() => ConnectionsMarkdownView|null} getActiveFileView
 * @property {(view_type: string) => ConnectionsWorkspaceLeaf[]} [getLeavesOfType]
 * @property {(new_leaf?: boolean|'tab'|'split'|'window') => ConnectionsWorkspaceLeaf} [getLeaf]
 * @property {(split: boolean) => ConnectionsWorkspaceLeaf|null} [getLeftLeaf]
 * @property {(split: boolean) => ConnectionsWorkspaceLeaf|null} [getRightLeaf]
 * @property {(leaf: ConnectionsWorkspaceLeaf) => Promise<void>|void} revealLeaf
 * @property {(leaf: ConnectionsWorkspaceLeaf, params?: {focus?: boolean}) => void} setActiveLeaf
 * @property {(source_id: string, config: Object.<string, unknown>) => void} [registerHoverLinkSource]
 */
export const ConnectionsWorkspaceOverrides = {};

/**
 * @typedef {ConnectionsWorkspaceOverrides} ConnectionsWorkspace
 */
export const ConnectionsWorkspace = {};

/**
 * @typedef {Object} ConnectionsVaultAdapter
 * @property {(path: string) => Promise<boolean>} exists
 * @property {(path: string) => Promise<string>} read
 * @property {(path: string, data: string) => Promise<void>} append
 * @property {(path: string, data: string) => Promise<void>} write
 * @property {(path: string) => Promise<void>} mkdir
 */
export const ConnectionsVaultAdapter = {};

/**
 * @typedef {Object} ConnectionsVault
 * @property {ConnectionsVaultAdapter} adapter
 * @property {string} configDir
 * @property {(path: string) => ConnectionsFile|null} [getAbstractFileByPath]
 */
export const ConnectionsVault = {};

/**
 * @typedef {Object} ConnectionsAppOverrides
 * @property {ConnectionsWorkspace} workspace
 * @property {ConnectionsVault} vault
 * @property {ConnectionsPluginsRegistry} plugins
 * @property {ConnectionsCommandsRegistry} commands
 * @property {ConnectionsSettingsManager} setting
 * @property {(key: string) => string|null} [loadLocalStorage]
 * @property {(key: string, value: string) => void} [saveLocalStorage]
 */
export const ConnectionsAppOverrides = {};

/**
 * @typedef {ConnectionsAppOverrides} ConnectionsApp
 */
export const ConnectionsApp = {};

/**
 * @typedef {Object} ConnectionsMarkdownPostProcessorContext
 * @property {string} sourcePath
 */
export const ConnectionsMarkdownPostProcessorContext = {};

/**
 * @typedef {Object} ConnectionsPluginOverrides
 * @property {ConnectionsApp} app
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {{id: string, version: string}} manifest
 * @property {{unload: () => void}} [notices]
 * @property {boolean} [update_available]
 * @property {string} [latest_release_version]
 * @property {(() => void)} [connections_view_location_listener]
 * @property {ConnectionsFooterViewScope} [connections_footer_view]
 * @property {(params?: object) => Promise<unknown>|unknown} [open_connections_view]
 * @property {(...args: unknown[]) => Promise<unknown>|unknown} [_open_connections_view_base]
 * @property {(target_path: string, event?: Event|null) => Promise<void>|void} [open_note]
 * @property {() => ConnectionsEditorView|null} get_editor_view
 * @property {(tab: object) => void} addSettingTab
 * @property {(extension: unknown) => void} registerEditorExtension
 * @property {(language: string, processor: (source: string, container: ConnectionsDomElement, context: ConnectionsMarkdownPostProcessorContext) => Promise<void>|void) => void} registerMarkdownCodeBlockProcessor
 * @property {(element: HTMLElement, event_name: string, callback: (event: Event) => unknown) => void} registerDomEvent
 * @property {(params?: Object.<string, unknown>) => void} register_item_views
 * @property {() => void} register_command_actions
 * @property {() => void} register_ribbon_actions
 * @property {() => Promise<boolean>} is_new_user
 * @property {(version: string) => Promise<boolean>} is_new_plugin_version
 * @property {(version: string) => Promise<void>} set_last_known_version
 */
export const ConnectionsPluginOverrides = {};

/**
 * @typedef {ConnectionsPluginOverrides} ConnectionsPlugin
 */
export const ConnectionsPlugin = {};

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
 * @property {(plugin: ConnectionsPlugin) => void} [unload_main]
 * @property {(menu_key: string, menu: ConnectionsMenu, scope: object, params?: ConnectionsActionParams) => void} [build_menu]
 */
export const ConnectionsEnvExtensions = {};

/**
 * @typedef {Object} ConnectionsPauseControls
 * @property {(paused: boolean) => void} update
 */
export const ConnectionsPauseControls = {};

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
export const ConnectionsItemViewScopeOverrides = {};

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
export const ConnectionsItemViewScope = {};

/**
 * @typedef {{
 *   new (leaf: ConnectionsWorkspaceLeaf, plugin: ConnectionsPlugin): ConnectionsItemViewScope,
 *   default_open_location: 'left'|'right'|'root'|'tab',
 *   get_view: (workspace: ConnectionsWorkspace) => ConnectionsItemViewScope|null|undefined,
 *   get_leaf: (workspace: ConnectionsWorkspace) => ConnectionsWorkspaceLeaf|null|undefined,
 *   open: (workspace: ConnectionsWorkspace, params?: {active?: boolean}) => Promise<ConnectionsItemViewScope|ConnectionsWorkspaceLeaf|null|undefined>
 * }} ConnectionsItemViewClass
 */
export const ConnectionsItemViewClass = function () {};

/**
 * @typedef {Object} ConnectionsSmartEnvClass
 * @property {(plugin: ConnectionsPlugin, config: ConnectionsEnvConfig) => void} create
 * @property {(state: Object.<string, boolean>) => Promise<void>} wait_for
 */
export const ConnectionsSmartEnvClass = {};

/**
 * @typedef {Object} ConnectionsFooterViewScopeOverrides
 * @property {ConnectionsApp} app
 * @property {ConnectionsPlugin} plugin
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {(params?: ConnectionsComponentOptions) => Promise<void>|void} render_view
 * @property {Object.<string, ConnectionsDomElement>} container_map
 * @property {Array<() => void>} [env_listeners]
 * @property {(() => void)|null} _detach_visibility_guard
 * @property {(editor_view: ConnectionsEditorView) => void} attach_visibility_guard
 * @property {() => void} detach_visibility_guard
 * @property {(event_key: string, callback: (event: ConnectionsEventPayload) => void) => void} register_env_listener
 * @property {() => void} register_env_listeners
 * @property {() => Promise<void>} open_settings
 * @property {() => void} remove
 * @property {() => void} unload
 */
export const ConnectionsFooterViewScopeOverrides = {};

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
export const ConnectionsFooterViewScope = {};

/**
 * @typedef {Object} ConnectionsSettingsTabScopeOverrides
 * @property {ConnectionsPlugin} plugin
 * @property {ConnectionsApp} app
 * @property {import('./smart-environment.js').SmartEnv<ConnectionsEnvExtensions>} env
 * @property {ConnectionsDomElement} containerEl
 * @property {ConnectionsDomElement} plugin_container
 * @property {() => void} hide
 * @property {(() => void)} [turn_off_listener]
 * @property {(container: ConnectionsDomElement) => Promise<void>} render_header
 * @property {(container: ConnectionsDomElement) => Promise<void>} render_plugin_settings
 * @property {() => void} register_env_events
 */
export const ConnectionsSettingsTabScopeOverrides = {};

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
export const ConnectionsSettingsTabScope = {};

/**
 * @typedef {HTMLElement & {
 *   empty: () => void,
 *   createDiv: (options?: Object.<string, unknown>) => ConnectionsDomElement,
 *   createEl: (tag_name: string, options?: Object.<string, unknown>) => ConnectionsDomElement,
 *   setText: (text: string) => void,
 *   addClass: (...class_names: string[]) => void,
 *   toggleClass: (class_name: string, value: boolean) => void,
 *   _has_listeners?: boolean
 * }} ConnectionsDomElement
 */
export const ConnectionsDomElement = {};

/**
 * @typedef {ConnectionsDomElement & {
 *   _connections_menu_state?: ConnectionsMenuState
 * }} ConnectionsViewElement
 */
export const ConnectionsViewElement = {};

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
 * @typedef {Object} ConnectionsMenuItemOverrides
 * @property {(title: string) => ConnectionsMenuItem} setTitle
 * @property {(icon: string) => ConnectionsMenuItem} setIcon
 * @property {(disabled: boolean) => ConnectionsMenuItem} setDisabled
 * @property {(callback: (event?: MouseEvent) => unknown) => ConnectionsMenuItem} onClick
 * @property {() => ConnectionsMenu} setSubmenu
 */
export const ConnectionsMenuItemOverrides = {};

/**
 * @typedef {ConnectionsMenuItemOverrides} ConnectionsMenuItem
 */
export const ConnectionsMenuItem = {};

/**
 * @typedef {Object} ConnectionsMenuOverrides
 * @property {ConnectionsMenuItem[]} [items]
 * @property {(callback: (item: ConnectionsMenuItem) => unknown) => ConnectionsMenu} addItem
 * @property {() => ConnectionsMenu} addSeparator
 * @property {(event: MouseEvent) => void} showAtMouseEvent
 * @property {(position: {x: number, y: number}) => void} [showAtPosition]
 */
export const ConnectionsMenuOverrides = {};

/**
 * @typedef {ConnectionsMenuOverrides} ConnectionsMenu
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
 * @typedef {Object} ConnectionsGraphResultEventDetail
 * @property {string} collection_key
 * @property {string} item_key
 */
export const ConnectionsGraphResultEventDetail = {};
