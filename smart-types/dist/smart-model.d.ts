export type SmartModelState = "unloaded" | "loading" | "loaded" | "unloading";
/**
 * @typedef {'unloaded'|'loading'|'loaded'|'unloading'} SmartModelState
 * @description Lifecycle state shared by SmartModel and SmartModelAdapter.
 */
export const SmartModelState: "";
export type SmartModelAdapterDefaults = {
    /**
     * - Human-readable provider label.
     */
    description?: string;
    /**
     * - Adapter type such as API or local.
     */
    type?: string;
    /**
     * - Adapter key.
     */
    adapter?: string;
    /**
     * - Default provider model id.
     */
    default_model?: string;
    /**
     * - Provider endpoint.
     */
    endpoint?: string;
    /**
     * - Provider models endpoint.
     */
    models_endpoint?: string;
    /**
     * - Whether the adapter supports streaming.
     */
    streaming?: boolean;
};
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
export const SmartModelAdapterDefaults: {};
export type SmartModelAdapterMap = {
    [x: string]: Function;
};
/**
 * @typedef {Object.<string, import('./smart-environment.js').SmartEnvClass>} SmartModelAdapterMap
 * @description Adapter constructors keyed by adapter/provider id.
 */
export const SmartModelAdapterMap: {};
export type SmartModelOptions = {
    /**
     * - Adapter/provider key.
     */
    adapter?: string;
    /**
     * - Available adapter constructors.
     */
    adapters: SmartModelAdapterMap;
    /**
     * - Runtime or persisted model settings.
     */
    settings: {
        [x: string]: any;
    };
    /**
     * - Explicit provider model id.
     */
    model_key?: string;
    /**
     * - Optional host callback used after settings changes.
     */
    reload_model?: () => void;
    /**
     * - Optional host callback used after settings changes.
     */
    re_render_settings?: () => void;
    /**
     * - Optional HTTP adapter override for API adapters.
     */
    http_adapter?: any;
};
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
export const SmartModelOptions: {};
export type SmartModelDropdownOption = {
    /**
     * - Stored option value.
     */
    value: string;
    /**
     * - Human-readable option label.
     */
    name: string;
};
/**
 * @typedef {Object} SmartModelDropdownOption
 * @property {string} value - Stored option value.
 * @property {string} name - Human-readable option label.
 */
export const SmartModelDropdownOption: {};
