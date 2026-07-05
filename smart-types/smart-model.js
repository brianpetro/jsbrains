/**
 * @typedef {'unloaded'|'loading'|'loaded'|'unloading'} SmartModelState
 * @description Lifecycle state shared by SmartModel and SmartModelAdapter.
 */
export const SmartModelState = '';

/**
 * @typedef {Object} SmartModelAdapterDefaults
 * @property {string} [description] - Human-readable provider label.
 * @property {string} [type] - Adapter type such as API or local.
 * @property {string} [adapter] - Adapter key.
 * @property {string} [default_model] - Default provider model id.
 * @property {string} [endpoint] - Provider endpoint.
 * @property {string} [models_endpoint] - Provider models endpoint.
 * @property {boolean} [streaming] - Whether the adapter supports streaming.
 */
export const SmartModelAdapterDefaults = {};

/**
 * @typedef {Object.<string, import('./smart-environment.js').SmartEnvClass>} SmartModelAdapterMap
 * @description Adapter constructors keyed by adapter/provider id.
 */
export const SmartModelAdapterMap = {};

/**
 * @typedef {Object} SmartModelOptions
 * @property {string} [adapter] - Adapter/provider key.
 * @property {SmartModelAdapterMap} adapters - Available adapter constructors.
 * @property {Object.<string, *>} settings - Runtime or persisted model settings.
 * @property {string} [model_key] - Explicit provider model id.
 * @property {function(): void} [reload_model] - Optional host callback used after settings changes.
 * @property {function(): void} [re_render_settings] - Optional host callback used after settings changes.
 * @property {*} [http_adapter] - Optional HTTP adapter override for API adapters.
 */
export const SmartModelOptions = {};

/**
 * @typedef {Object} SmartModelDropdownOption
 * @property {string} value - Stored option value.
 * @property {string} name - Human-readable option label.
 */
export const SmartModelDropdownOption = {};
