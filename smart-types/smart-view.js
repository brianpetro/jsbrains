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
export const SmartViewScope = {};

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
export const SmartViewInstance = {};

/**
 * @typedef {Object} SmartViewOptions
 * @property {import('./smart-environment.js').SmartEnvClass} [adapter] - View adapter class.
 * @property {unknown} [main] - Host application or plugin object.
 * @property {Document} [document] - Document used for fragment creation.
 */
export const SmartViewOptions = {};

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
export const SmartViewSettingDataset = {};

/**
 * @typedef {HTMLElement & {dataset: SmartViewSettingDataset}} SmartViewSettingElement
 */
export const SmartViewSettingElement = {};

/**
 * @typedef {Object} SmartViewSettingControl
 * @property {HTMLElement} [inputEl] - Primary input element.
 * @property {HTMLElement} [selectEl] - Dropdown select element.
 * @property {(value: unknown) => void} [setValue] - Programmatically set the control value.
 * @property {() => unknown} [getValue] - Get the current control value.
 * @property {(callback: (value: unknown) => void) => void} [onChange] - Register a change callback.
 * @property {(callback: (event: MouseEvent) => void) => void} [onClick] - Register a click callback.
 */
export const SmartViewSettingControl = {};

/**
 * @callback SmartViewSettingConfigurator
 * @param {SmartViewSettingControl} control - Control API exposed by the concrete setting renderer.
 * @returns {void}
 */
export const SmartViewSettingConfigurator = function () {};

/**
 * @callback SmartViewSettingRenderer
 * @param {SmartViewSettingElement} elm - Setting placeholder element.
 * @param {string} path - Setting path.
 * @param {unknown} value - Current setting value.
 * @param {SmartViewScope} scope - Render scope.
 * @param {Object.<string, unknown>} [settings_scope] - Optional nested settings scope.
 * @returns {unknown}
 */
export const SmartViewSettingRenderer = function () {};

/**
 * @typedef {Object.<string, SmartViewSettingRenderer>} SmartViewSettingRendererMap
 * @description Setting renderers keyed by setting type.
 */
export const SmartViewSettingRendererMap = {};

/**
 * @typedef {Object} SmartViewRenderParams
 * @property {string} html - HTML string to render.
 * @property {SmartViewScope} [scope] - Render scope.
 * @property {Object.<string, unknown>} [opts] - Render options.
 */
export const SmartViewRenderParams = {};
