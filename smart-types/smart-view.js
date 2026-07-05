/**
 * @typedef {Object.<string, *>} SmartViewScope
 * @property {string} [key] - Scope key used by component/render helpers.
 * @property {Object.<string, *>} [settings] - Settings object rendered by settings components.
 * @property {Object.<string, *>} [actions] - Action callbacks available to rendered controls.
 * @property {import('./smart-collections.js').CollectionEnv} [env] - Smart Environment instance.
 */
export const SmartViewScope = {};

/**
 * @typedef {Object} SmartViewOptions
 * @property {import('./smart-environment.js').SmartEnvClass} [adapter] - View adapter class.
 * @property {*} [main] - Host application or plugin object.
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
 * @property {(value: *) => void} [setValue] - Programmatically set the control value.
 * @property {() => *} [getValue] - Get the current control value.
 * @property {(callback: function(*): void) => void} [onChange] - Register a change callback.
 * @property {(callback: function(MouseEvent): void) => void} [onClick] - Register a click callback.
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
 * @param {*} value - Current setting value.
 * @param {SmartViewScope} scope - Render scope.
 * @param {Object.<string, *>} [settings_scope] - Optional nested settings scope.
 * @returns {*}
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
 * @property {Object.<string, *>} [opts] - Render options.
 */
export const SmartViewRenderParams = {};
