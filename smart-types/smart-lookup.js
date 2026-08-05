/**
 * @typedef {Object} LookupListItemComponentSettings
 * @property {boolean} [show_full_path] - Whether result headers include the full item path.
 * @property {boolean} [render_markdown] - Whether result content is rendered as Markdown.
 */
export const LookupListItemComponentSettings = {};

/**
 * @typedef {Object} LookupListSettings
 * @property {string} [get_results_action_key] - Action used to retrieve Lookup results.
 * @property {string} [results_collection_key] - Collection used as the result source.
 * @property {string} [score_algo_key] - Scoring action key.
 * @property {number} [results_limit] - Maximum number of results.
 * @property {boolean} [expanded_view] - Whether result items render expanded by default.
 * @property {{lookup_v3_list_item?: LookupListItemComponentSettings}} [components] - Component-specific settings.
 */
export const LookupListSettings = {};

/**
 * @typedef {Object} LookupListData
 * @property {string} [key] - Persisted Lookup List key.
 * @property {string} [query] - Query represented by the Lookup List.
 */
export const LookupListData = {};

/**
 * @typedef {Object} LookupEditor
 * @property {() => string} getSelection - Returns the active editor selection.
 */
export const LookupEditor = {};

/**
 * @typedef {Object} LookupWorkspace
 * @property {(callback: () => unknown) => unknown} onLayoutReady - Runs a callback when the workspace layout is ready.
 * @property {(event_name: string, callback: (menu: unknown, editor: LookupEditor) => unknown) => unknown} on - Registers a workspace event callback.
 */
export const LookupWorkspace = {};

/**
 * @typedef {Object} LookupApp
 * @property {LookupWorkspace} workspace - Host workspace.
 */
export const LookupApp = {};

/**
 * @typedef {Object} LookupItem
 * @property {string} key - Stable result item key.
 * @property {string} path - Source path used for display and lookup.
 * @property {string} collection_key - Environment collection containing the item.
 * @property {import('./smart-collections.js').CollectionItemData} [data] - Persisted item data.
 * @property {string} [link] - Optional item link.
 * @property {number[]} [lines] - Optional source line range.
 * @property {boolean} [is_media] - Whether the item should render as media.
 * @property {string} [embed_link] - Embed link used for media rendering.
 * @property {LookupEnvironment} env - Smart Environment containing the item.
 * @property {() => Promise<string>|string} read - Reads the item content.
 * @property {(event_key: string, payload?: Object.<string, unknown>) => void} emit_event - Emits an item-scoped event.
 */
export const LookupItem = {};

/**
 * @typedef {Object} LookupItemCollection
 * @property {(key?: string) => LookupItem} get - Returns an item by key.
 */
export const LookupItemCollection = {};

/**
 * @typedef {Object} LookupResult
 * @property {LookupItem} item - Matched item.
 * @property {number} score - Similarity or relevance score.
 */
export const LookupResult = {};

/**
 * @typedef {Object} LookupComponentParams
 * @property {string} [query] - Lookup query.
 * @property {boolean} [auto_submit] - Whether the query should auto-submit.
 * @property {string} [event_source] - Source that initiated the action.
 * @property {boolean} [active] - Whether an opened view should be active.
 * @property {LookupView} [view] - Lookup view instance.
 * @property {LookupApp} [app] - Host application.
 * @property {unknown} [workspace] - Host workspace.
 * @property {HTMLElement} [container] - Rendering container.
 * @property {LookupResult[]} [results] - Lookup results.
 * @property {LookupList} [lookup_list] - Lookup List scope.
 * @property {LookupListSettings} [lookup_settings] - Lookup settings override.
 * @property {string} [event_key_domain] - Event namespace for result interactions.
 * @property {Event} [event] - Triggering DOM event.
 * @property {LookupItem} [target_item] - Result item targeted by a menu action.
 * @property {LookupResult} [target_result] - Result targeted by a menu action.
 * @property {LookupPlugin} [plugin] - Plugin opening or rendering the view.
 */
export const LookupComponentParams = {};

/**
 * @typedef {Object} LookupList
 * @property {string} key - Stable Lookup List key.
 * @property {LookupListData} data - Persisted Lookup List data.
 * @property {LookupEnvironment} env - Smart Environment containing the list.
 * @property {{lookup_list_get_results?: (params?: LookupComponentParams) => Promise<LookupResult[]>|LookupResult[]}} actions - Lookup List actions.
 * @property {LookupListSettings} settings - Resolved Lookup settings.
 * @property {(params?: LookupComponentParams) => Promise<LookupResult[]>|LookupResult[]} [get_results] - Direct result retrieval fallback.
 * @property {LookupList} [item] - Compatibility item alias.
 */
export const LookupList = {};

/**
 * @typedef {Object} LookupLists
 * @property {LookupEnvironment} env - Smart Environment containing the collection.
 * @property {LookupListSettings} settings - Resolved collection settings.
 * @property {import('./smart-environment.js').SettingsConfig} settings_config - Collection settings schema.
 * @property {(params: LookupComponentParams) => LookupList} new_item - Creates or reuses a Lookup List.
 */
export const LookupLists = {};

/**
 * @typedef {Object} LookupPlugin
 * @property {{id: string, version?: string}} manifest - Plugin manifest identity.
 * @property {LookupApp} app - Host application.
 * @property {LookupEnvironment} env - Smart Environment instance.
 * @property {{unload?: () => void}} [notices] - Plugin notice manager.
 * @property {(tab: unknown) => void} addSettingTab - Registers a plugin settings tab.
 * @property {(params?: {skip_command_registration?: boolean}) => void} register_item_views - Registers plugin item views.
 * @property {(event_ref: unknown) => void} registerEvent - Registers a host event reference.
 * @property {() => void} register_ribbon_actions - Registers configured ribbon actions.
 * @property {() => void} register_command_actions - Registers configured command actions.
 * @property {() => Promise<void>} check_for_updates - Checks whether release notes should be shown.
 * @property {(params?: LookupComponentParams) => void} [open_lookup_view] - Opens the Lookup view.
 */
export const LookupPlugin = {};

/**
 * @typedef {Object} LookupEnvironment
 * @property {LookupLists} lookup_lists - Lookup Lists collection.
 * @property {{render_component: (component_key: string, scope: unknown, params?: LookupComponentParams) => Promise<Node>|Node}} smart_components - Smart component renderer.
 * @property {{embed_model: import('./smart-entities.js').EmbedModel & {is_loaded: boolean, load_background: () => Promise<void>}}} smart_sources - Smart Sources collection and embed model.
 * @property {LookupPlugin} [plugin] - Environment plugin.
 * @property {LookupPlugin} [smart_lookup_plugin] - Smart Lookup plugin reference.
 * @property {LookupPlugin} [main] - Primary plugin reference.
 * @property {LookupApp} [obsidian_app] - Host application reference.
 * @property {{collections: {lookup_lists: {settings_config: import('./smart-environment.js').SettingsConfig}}}} config - Resolved environment configuration.
 * @property {{settings?: {native_notice_attention?: boolean}}} [event_logs] - Event log settings.
 * @property {{emit?: (event_key: string, payload?: Object.<string, unknown>) => unknown}} [events] - Environment event bus.
 * @property {(menu_key: string, menu: unknown, scope: LookupList|LookupLists, params?: LookupComponentParams) => unknown} [build_menu] - Builds registered menu actions.
 * @property {(plugin: LookupPlugin) => unknown} [unload_main] - Unloads a plugin from the environment.
 */
export const LookupEnvironment = {};

/**
 * @typedef {Object} LookupView
 * @property {LookupEnvironment} env - Lookup environment.
 * @property {LookupPlugin} [plugin] - Owning plugin.
 * @property {LookupApp} [app] - Host application.
 */
export const LookupView = {};

/**
 * @typedef {Object} LookupComponentRenderer
 * @property {(sheet: string|CSSStyleSheet, params?: Object.<string, unknown>) => unknown} apply_style_sheet - Applies a component stylesheet.
 * @property {(html: string) => DocumentFragment} create_doc_fragment - Creates a document fragment from HTML.
 * @property {(icon_name: string) => string} get_icon_html - Returns icon markup.
 * @property {(container: Node) => void} empty - Clears a rendered container.
 * @property {(container: Element, html: string) => void} safe_inner_html - Safely replaces container HTML.
 * @property {(markdown: string, scope?: unknown) => Promise<DocumentFragment>} render_markdown - Renders Markdown.
 */
export const LookupComponentRenderer = {};

/**
 * @typedef {Object} LookupActionContext
 * @property {LookupPlugin} plugin - Plugin action scope.
 * @property {LookupEnvironment} env - Smart Environment action scope.
 * @property {{getSelection?: () => string}} [editor] - Editor action scope.
 * @property {LookupComponentParams} params - Resolved action parameters.
 */
export const LookupActionContext = {};

/**
 * @callback LookupGetItemDisplayName
 * @param {LookupItem} item - Lookup item.
 * @param {LookupListItemComponentSettings} [settings] - Display settings.
 * @returns {string} Item display name.
 */
export const LookupGetItemDisplayName = function () {};

/**
 * @callback LookupRegisterItemDrag
 * @param {HTMLElement} container - Result container.
 * @param {LookupItem} item - Lookup item.
 * @param {{drag_event_key: string}} params - Drag registration parameters.
 * @returns {void}
 */
export const LookupRegisterItemDrag = function () {};

/**
 * @callback LookupRegisterItemHoverPopover
 * @param {HTMLElement} container - Result container.
 * @param {LookupItem} item - Lookup item.
 * @param {{event_key_domain: string}} params - Hover registration parameters.
 * @returns {void}
 */
export const LookupRegisterItemHoverPopover = function () {};

/**
 * @callback LookupOpenSource
 * @param {LookupItem} item - Lookup item.
 * @param {Event} event - Triggering event.
 * @returns {void}
 */
export const LookupOpenSource = function () {};

/**
 * @callback LookupRenderSettingsConfig
 * @param {() => import('./smart-environment.js').SettingsConfig} settings_config - Settings config resolver.
 * @param {LookupLists} scope - Lookup Lists scope.
 * @param {HTMLElement} container - Settings container.
 * @param {Object.<string, unknown>} [params] - Settings renderer parameters.
 * @returns {unknown}
 */
export const LookupRenderSettingsConfig = function () {};

