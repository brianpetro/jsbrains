export type LookupListItemComponentSettings = {
    /**
     * - Whether result headers include the full item path.
     */
    show_full_path?: boolean;
    /**
     * - Whether result content is rendered as Markdown.
     */
    render_markdown?: boolean;
};
/**
 * @typedef {Object} LookupListItemComponentSettings
 * @property {boolean} [show_full_path] - Whether result headers include the full item path.
 * @property {boolean} [render_markdown] - Whether result content is rendered as Markdown.
 */
export const LookupListItemComponentSettings: {};
export type LookupListSettings = {
    /**
     * - Action used to retrieve Lookup results.
     */
    get_results_action_key?: string;
    /**
     * - Collection used as the result source.
     */
    results_collection_key?: string;
    /**
     * - Scoring action key.
     */
    score_algo_key?: string;
    /**
     * - Maximum number of results.
     */
    results_limit?: number;
    /**
     * - Whether result items render expanded by default.
     */
    expanded_view?: boolean;
    /**
     * - Component-specific settings.
     */
    components?: {
        lookup_v3_list_item?: LookupListItemComponentSettings;
    };
};
/**
 * @typedef {Object} LookupListSettings
 * @property {string} [get_results_action_key] - Action used to retrieve Lookup results.
 * @property {string} [results_collection_key] - Collection used as the result source.
 * @property {string} [score_algo_key] - Scoring action key.
 * @property {number} [results_limit] - Maximum number of results.
 * @property {boolean} [expanded_view] - Whether result items render expanded by default.
 * @property {{lookup_v3_list_item?: LookupListItemComponentSettings}} [components] - Component-specific settings.
 */
export const LookupListSettings: {};
export type LookupListData = {
    /**
     * - Persisted Lookup List key.
     */
    key?: string;
    /**
     * - Query represented by the Lookup List.
     */
    query?: string;
};
/**
 * @typedef {Object} LookupListData
 * @property {string} [key] - Persisted Lookup List key.
 * @property {string} [query] - Query represented by the Lookup List.
 */
export const LookupListData: {};
export type LookupEditor = {
    /**
     * - Returns the active editor selection.
     */
    getSelection: () => string;
};
/**
 * @typedef {Object} LookupEditor
 * @property {() => string} getSelection - Returns the active editor selection.
 */
export const LookupEditor: {};
export type LookupWorkspace = {
    /**
     * - Runs a callback when the workspace layout is ready.
     */
    onLayoutReady: (callback: () => unknown) => unknown;
    /**
     * - Registers a workspace event callback.
     */
    on: (event_name: string, callback: (menu: unknown, editor: LookupEditor) => unknown) => unknown;
};
/**
 * @typedef {Object} LookupWorkspace
 * @property {(callback: () => unknown) => unknown} onLayoutReady - Runs a callback when the workspace layout is ready.
 * @property {(event_name: string, callback: (menu: unknown, editor: LookupEditor) => unknown) => unknown} on - Registers a workspace event callback.
 */
export const LookupWorkspace: {};
export type LookupApp = {
    /**
     * - Host workspace.
     */
    workspace: LookupWorkspace;
};
/**
 * @typedef {Object} LookupApp
 * @property {LookupWorkspace} workspace - Host workspace.
 */
export const LookupApp: {};
export type LookupItem = {
    /**
     * - Stable result item key.
     */
    key: string;
    /**
     * - Source path used for display and lookup.
     */
    path: string;
    /**
     * - Environment collection containing the item.
     */
    collection_key: string;
    /**
     * - Persisted item data.
     */
    data?: import("./smart-collections.js").CollectionItemData;
    /**
     * - Optional item link.
     */
    link?: string;
    /**
     * - Optional source line range.
     */
    lines?: number[];
    /**
     * - Whether the item should render as media.
     */
    is_media?: boolean;
    /**
     * - Embed link used for media rendering.
     */
    embed_link?: string;
    /**
     * - Smart Environment containing the item.
     */
    env: LookupEnvironment;
    /**
     * - Reads the item content.
     */
    read: () => Promise<string> | string;
    /**
     * - Emits an item-scoped event.
     */
    emit_event: (event_key: string, payload?: {
        [x: string]: unknown;
    }) => void;
};
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
export const LookupItem: {};
export type LookupItemCollection = {
    /**
     * - Returns an item by key.
     */
    get: (key?: string) => LookupItem;
};
/**
 * @typedef {Object} LookupItemCollection
 * @property {(key?: string) => LookupItem} get - Returns an item by key.
 */
export const LookupItemCollection: {};
export type LookupResult = {
    /**
     * - Matched item.
     */
    item: LookupItem;
    /**
     * - Similarity or relevance score.
     */
    score: number;
};
/**
 * @typedef {Object} LookupResult
 * @property {LookupItem} item - Matched item.
 * @property {number} score - Similarity or relevance score.
 */
export const LookupResult: {};
export type LookupComponentParams = {
    /**
     * - Lookup query.
     */
    query?: string;
    /**
     * - Whether the query should auto-submit.
     */
    auto_submit?: boolean;
    /**
     * - Source that initiated the action.
     */
    event_source?: string;
    /**
     * - Whether an opened view should be active.
     */
    active?: boolean;
    /**
     * - Lookup view instance.
     */
    view?: LookupView;
    /**
     * - Host application.
     */
    app?: LookupApp;
    /**
     * - Host workspace.
     */
    workspace?: unknown;
    /**
     * - Rendering container.
     */
    container?: HTMLElement;
    /**
     * - Lookup results.
     */
    results?: LookupResult[];
    /**
     * - Lookup List scope.
     */
    lookup_list?: LookupList;
    /**
     * - Lookup settings override.
     */
    lookup_settings?: LookupListSettings;
    /**
     * - Event namespace for result interactions.
     */
    event_key_domain?: string;
    /**
     * - Triggering DOM event.
     */
    event?: Event;
    /**
     * - Result item targeted by a menu action.
     */
    target_item?: LookupItem;
    /**
     * - Result targeted by a menu action.
     */
    target_result?: LookupResult;
    /**
     * - Plugin opening or rendering the view.
     */
    plugin?: LookupPlugin;
};
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
export const LookupComponentParams: {};
export type LookupList = {
    /**
     * - Stable Lookup List key.
     */
    key: string;
    /**
     * - Persisted Lookup List data.
     */
    data: LookupListData;
    /**
     * - Smart Environment containing the list.
     */
    env: LookupEnvironment;
    /**
     * - Lookup List actions.
     */
    actions: {
        lookup_list_get_results?: (params?: LookupComponentParams) => Promise<LookupResult[]> | LookupResult[];
    };
    /**
     * - Resolved Lookup settings.
     */
    settings: LookupListSettings;
    /**
     * - Direct result retrieval fallback.
     */
    get_results?: (params?: LookupComponentParams) => Promise<LookupResult[]> | LookupResult[];
    /**
     * - Compatibility item alias.
     */
    item?: LookupList;
};
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
export const LookupList: {};
export type LookupLists = {
    /**
     * - Smart Environment containing the collection.
     */
    env: LookupEnvironment;
    /**
     * - Resolved collection settings.
     */
    settings: LookupListSettings;
    /**
     * - Collection settings schema.
     */
    settings_config: import("./smart-environment.js").SettingsConfig;
    /**
     * - Creates or reuses a Lookup List.
     */
    new_item: (params: LookupComponentParams) => LookupList;
};
/**
 * @typedef {Object} LookupLists
 * @property {LookupEnvironment} env - Smart Environment containing the collection.
 * @property {LookupListSettings} settings - Resolved collection settings.
 * @property {import('./smart-environment.js').SettingsConfig} settings_config - Collection settings schema.
 * @property {(params: LookupComponentParams) => LookupList} new_item - Creates or reuses a Lookup List.
 */
export const LookupLists: {};
export type LookupPlugin = {
    /**
     * - Plugin manifest identity.
     */
    manifest: {
        id: string;
        version?: string;
    };
    /**
     * - Host application.
     */
    app: LookupApp;
    /**
     * - Smart Environment instance.
     */
    env: LookupEnvironment;
    /**
     * - Plugin notice manager.
     */
    notices?: {
        unload?: () => void;
    };
    /**
     * - Registers a plugin settings tab.
     */
    addSettingTab: (tab: unknown) => void;
    /**
     * - Registers plugin item views.
     */
    register_item_views: (params?: {
        skip_command_registration?: boolean;
    }) => void;
    /**
     * - Registers a host event reference.
     */
    registerEvent: (event_ref: unknown) => void;
    /**
     * - Registers configured ribbon actions.
     */
    register_ribbon_actions: () => void;
    /**
     * - Registers configured command actions.
     */
    register_command_actions: () => void;
    /**
     * - Checks whether release notes should be shown.
     */
    check_for_updates: () => Promise<void>;
    /**
     * - Opens the Lookup view.
     */
    open_lookup_view?: (params?: LookupComponentParams) => void;
};
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
export const LookupPlugin: {};
export type LookupEnvironment = {
    /**
     * - Lookup Lists collection.
     */
    lookup_lists: LookupLists;
    /**
     * - Smart component renderer.
     */
    smart_components: {
        render_component: (component_key: string, scope: unknown, params?: LookupComponentParams) => Promise<Node> | Node;
    };
    /**
     * - Smart Sources collection and embed model.
     */
    smart_sources: {
        embed_model: import("./smart-entities.js").EmbedModel & {
            is_loaded: boolean;
            load_background: () => Promise<void>;
        };
    };
    /**
     * - Environment plugin.
     */
    plugin?: LookupPlugin;
    /**
     * - Smart Lookup plugin reference.
     */
    smart_lookup_plugin?: LookupPlugin;
    /**
     * - Primary plugin reference.
     */
    main?: LookupPlugin;
    /**
     * - Host application reference.
     */
    obsidian_app?: LookupApp;
    /**
     * - Resolved environment configuration.
     */
    config: {
        collections: {
            lookup_lists: {
                settings_config: import("./smart-environment.js").SettingsConfig;
            };
        };
    };
    /**
     * - Event log settings.
     */
    event_logs?: {
        settings?: {
            native_notice_attention?: boolean;
        };
    };
    /**
     * - Environment event bus.
     */
    events?: {
        emit?: (event_key: string, payload?: {
            [x: string]: unknown;
        }) => unknown;
    };
    /**
     * - Builds registered menu actions.
     */
    build_menu?: (menu_key: string, menu: unknown, scope: LookupList | LookupLists, params?: LookupComponentParams) => unknown;
    /**
     * - Unloads a plugin from the environment.
     */
    unload_main?: (plugin: LookupPlugin) => unknown;
};
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
export const LookupEnvironment: {};
export type LookupView = {
    /**
     * - Lookup environment.
     */
    env: LookupEnvironment;
    /**
     * - Owning plugin.
     */
    plugin?: LookupPlugin;
    /**
     * - Host application.
     */
    app?: LookupApp;
};
/**
 * @typedef {Object} LookupView
 * @property {LookupEnvironment} env - Lookup environment.
 * @property {LookupPlugin} [plugin] - Owning plugin.
 * @property {LookupApp} [app] - Host application.
 */
export const LookupView: {};
export type LookupComponentRenderer = {
    /**
     * - Applies a component stylesheet.
     */
    apply_style_sheet: (sheet: string | CSSStyleSheet, params?: {
        [x: string]: unknown;
    }) => unknown;
    /**
     * - Creates a document fragment from HTML.
     */
    create_doc_fragment: (html: string) => DocumentFragment;
    /**
     * - Returns icon markup.
     */
    get_icon_html: (icon_name: string) => string;
    /**
     * - Clears a rendered container.
     */
    empty: (container: Node) => void;
    /**
     * - Safely replaces container HTML.
     */
    safe_inner_html: (container: Element, html: string) => void;
    /**
     * - Renders Markdown.
     */
    render_markdown: (markdown: string, scope?: unknown) => Promise<DocumentFragment>;
};
/**
 * @typedef {Object} LookupComponentRenderer
 * @property {(sheet: string|CSSStyleSheet, params?: Object.<string, unknown>) => unknown} apply_style_sheet - Applies a component stylesheet.
 * @property {(html: string) => DocumentFragment} create_doc_fragment - Creates a document fragment from HTML.
 * @property {(icon_name: string) => string} get_icon_html - Returns icon markup.
 * @property {(container: Node) => void} empty - Clears a rendered container.
 * @property {(container: Element, html: string) => void} safe_inner_html - Safely replaces container HTML.
 * @property {(markdown: string, scope?: unknown) => Promise<DocumentFragment>} render_markdown - Renders Markdown.
 */
export const LookupComponentRenderer: {};
export type LookupActionContext = {
    /**
     * - Plugin action scope.
     */
    plugin: LookupPlugin;
    /**
     * - Smart Environment action scope.
     */
    env: LookupEnvironment;
    /**
     * - Editor action scope.
     */
    editor?: {
        getSelection?: () => string;
    };
    /**
     * - Resolved action parameters.
     */
    params: LookupComponentParams;
};
/**
 * @typedef {Object} LookupActionContext
 * @property {LookupPlugin} plugin - Plugin action scope.
 * @property {LookupEnvironment} env - Smart Environment action scope.
 * @property {{getSelection?: () => string}} [editor] - Editor action scope.
 * @property {LookupComponentParams} params - Resolved action parameters.
 */
export const LookupActionContext: {};
export type LookupGetItemDisplayName = (item: LookupItem, settings?: LookupListItemComponentSettings) => string;
export function LookupGetItemDisplayName(): void;
export type LookupRegisterItemDrag = (container: HTMLElement, item: LookupItem, params: {
    drag_event_key: string;
}) => void;
export function LookupRegisterItemDrag(): void;
export type LookupRegisterItemHoverPopover = (container: HTMLElement, item: LookupItem, params: {
    event_key_domain: string;
}) => void;
export function LookupRegisterItemHoverPopover(): void;
export type LookupOpenSource = (item: LookupItem, event: Event) => void;
export function LookupOpenSource(): void;
export type LookupRenderSettingsConfig = (settings_config: () => import("./smart-environment.js").SettingsConfig, scope: LookupLists, container: HTMLElement, params?: {
    [x: string]: unknown;
}) => unknown;
export function LookupRenderSettingsConfig(): void;
