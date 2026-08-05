export type SmartViewScope<TSettings = {
    [x: string]: unknown;
}, TActions = {
    [x: string]: (...args: unknown[]) => unknown;
}, TEnv = {
    [x: string]: unknown;
}> = {
    /**
     * - Scope key used by component/render helpers.
     */
    key?: string;
    /**
     * - Settings object rendered by settings components.
     */
    settings?: TSettings;
    /**
     * - Action callbacks available to rendered controls.
     */
    actions?: TActions;
    /**
     * - Smart Environment instance.
     */
    env?: TEnv;
};
/**
 * @template [TSettings=Object.<string, unknown>]
 * @template [TActions=Object.<string, (...args: unknown[]) => unknown>]
 * @template [TEnv=import('./smart-collections.js').CollectionEnv]
 * @typedef {Object} SmartViewScope
 * @property {string} [key] - Scope key used by component/render helpers.
 * @property {TSettings} [settings] - Settings object rendered by settings components.
 * @property {TActions} [actions] - Action callbacks available to rendered controls.
 * @property {TEnv} [env] - Smart Environment instance.
 */
export const SmartViewScope: {};
/**
 * Canonical SmartView instance contract used by host adapters and domain views.
 */
export type SmartViewInstance<TScope = SmartViewScope<{
    [x: string]: unknown;
}, {
    [x: string]: (...args: unknown[]) => unknown;
}, {
    [x: string]: unknown;
}>> = {
    /**
     * - Creates a fragment from trusted HTML.
     */
    create_doc_fragment: (html: string) => DocumentFragment;
    /**
     * - Installs a stylesheet.
     */
    apply_style_sheet: (css_text: string, params?: {
        [x: string]: unknown;
    }) => HTMLElement | CSSStyleSheet | void;
    /**
     * - Returns adapter-provided icon HTML.
     */
    get_icon_html: (icon_name: string) => string;
    /**
     * - Removes all child nodes.
     */
    empty: (container: Element | DocumentFragment | null) => void;
    /**
     * - Disposes resources when an element is removed.
     */
    attach_disposer: (container: HTMLElement, disposer: (() => void) | Array<() => void>) => void;
    /**
     * - Replaces element HTML through the configured sanitizer.
     */
    safe_inner_html: (element: Element, html: string) => void;
    /**
     * - Renders markdown through the host adapter.
     */
    render_markdown: (markdown: string, scope?: TScope | null) => Promise<DocumentFragment>;
};
/**
 * Canonical SmartView instance contract used by host adapters and domain views.
 *
 * @template [TScope=import('./smart-view.js').SmartViewScope]
 * @typedef {Object} SmartViewInstance
 * @property {(html: string) => DocumentFragment} create_doc_fragment - Creates a fragment from trusted HTML.
 * @property {(css_text: string, params?: Object.<string, unknown>) => HTMLElement|CSSStyleSheet|void} apply_style_sheet - Installs a stylesheet.
 * @property {(icon_name: string) => string} get_icon_html - Returns adapter-provided icon HTML.
 * @property {(container: Element|DocumentFragment|null) => void} empty - Removes all child nodes.
 * @property {(container: HTMLElement, disposer: (() => void)|Array<() => void>) => void} attach_disposer - Disposes resources when an element is removed.
 * @property {(element: Element, html: string) => void} safe_inner_html - Replaces element HTML through the configured sanitizer.
 * @property {(markdown: string, scope?: TScope|null) => Promise<DocumentFragment>} render_markdown - Renders markdown through the host adapter.
 */
export const SmartViewInstance: {};
export type SmartViewOptions = {
    /**
     * - View adapter class.
     */
    adapter?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Host application or plugin object.
     */
    main?: unknown;
    /**
     * - Document used for fragment creation.
     */
    document?: Document;
};
/**
 * @typedef {Object} SmartViewOptions
 * @property {import('./smart-environment.js').SmartEnvClass} [adapter] - View adapter class.
 * @property {unknown} [main] - Host application or plugin object.
 * @property {Document} [document] - Document used for fragment creation.
 */
export const SmartViewOptions: {};
export type SmartViewSettingDataset = {
    /**
     * - Dot path into the settings object.
     */
    setting?: string;
    /**
     * - Setting control type.
     */
    type?: string;
    /**
     * - Display name.
     */
    name?: string;
    /**
     * - Display description.
     */
    description?: string;
    /**
     * - Serialized current value.
     */
    value?: string;
    /**
     * - Serialized default value.
     */
    default?: string;
    /**
     * - Input placeholder.
     */
    placeholder?: string;
    /**
     * - Serialized dropdown options.
     */
    options?: string;
    /**
     * - Path to callback that returns dropdown options.
     */
    optionsCallback?: string;
    /**
     * - Path to setting change callback.
     */
    callback?: string;
    /**
     * - Optional inline button text.
     */
    button?: string;
    /**
     * - Required marker.
     */
    required?: string;
    /**
     * - Disabled marker.
     */
    disabled?: string;
};
/**
 * @typedef {Object} SmartViewSettingDataset
 * @property {string} [setting] - Dot path into the settings object.
 * @property {string} [type] - Setting control type.
 * @property {string} [name] - Display name.
 * @property {string} [description] - Display description.
 * @property {string} [value] - Serialized current value.
 * @property {string} [default] - Serialized default value.
 * @property {string} [placeholder] - Input placeholder.
 * @property {string} [options] - Serialized dropdown options.
 * @property {string} [optionsCallback] - Path to callback that returns dropdown options.
 * @property {string} [callback] - Path to setting change callback.
 * @property {string} [button] - Optional inline button text.
 * @property {string} [required] - Required marker.
 * @property {string} [disabled] - Disabled marker.
 */
export const SmartViewSettingDataset: {};
export type SmartViewSettingElement = HTMLElement & {
    dataset: SmartViewSettingDataset;
};
/**
 * @typedef {HTMLElement & {dataset: SmartViewSettingDataset}} SmartViewSettingElement
 */
export const SmartViewSettingElement: {};
export type SmartViewSettingControl = {
    /**
     * - Primary input element.
     */
    inputEl?: HTMLElement;
    /**
     * - Dropdown select element.
     */
    selectEl?: HTMLElement;
    /**
     * - Programmatically set the control value.
     */
    setValue?: (value: unknown) => void;
    /**
     * - Get the current control value.
     */
    getValue?: () => unknown;
    /**
     * - Register a change callback.
     */
    onChange?: (callback: (value: unknown) => void) => void;
    /**
     * - Register a click callback.
     */
    onClick?: (callback: (event: MouseEvent) => void) => void;
};
/**
 * @typedef {Object} SmartViewSettingControl
 * @property {HTMLElement} [inputEl] - Primary input element.
 * @property {HTMLElement} [selectEl] - Dropdown select element.
 * @property {(value: unknown) => void} [setValue] - Programmatically set the control value.
 * @property {() => unknown} [getValue] - Get the current control value.
 * @property {(callback: (value: unknown) => void) => void} [onChange] - Register a change callback.
 * @property {(callback: (event: MouseEvent) => void) => void} [onClick] - Register a click callback.
 */
export const SmartViewSettingControl: {};
export type SmartViewSettingConfigurator = (control: SmartViewSettingControl) => void;
export function SmartViewSettingConfigurator(): void;
export type SmartViewSettingRenderer = (elm: SmartViewSettingElement, path: string, value: unknown, scope: SmartViewScope, settings_scope?: {
    [x: string]: unknown;
}) => unknown;
export function SmartViewSettingRenderer(): void;
export type SmartViewSettingRendererMap = {
    [x: string]: SmartViewSettingRenderer;
};
/**
 * @typedef {Object.<string, SmartViewSettingRenderer>} SmartViewSettingRendererMap
 * @description Setting renderers keyed by setting type.
 */
export const SmartViewSettingRendererMap: {};
export type SmartViewRenderParams = {
    /**
     * - HTML string to render.
     */
    html: string;
    /**
     * - Render scope.
     */
    scope?: SmartViewScope;
    /**
     * - Render options.
     */
    opts?: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {Object} SmartViewRenderParams
 * @property {string} html - HTML string to render.
 * @property {SmartViewScope} [scope] - Render scope.
 * @property {Object.<string, unknown>} [opts] - Render options.
 */
export const SmartViewRenderParams: {};
