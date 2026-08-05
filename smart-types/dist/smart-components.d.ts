export type SmartEnvComponentConfig = {
    /**
     * - Component render function.
     */
    render: import("./smart-environment.js").SmartEnvCallable;
    /**
     * - Optional component settings schema or resolver.
     */
    settings_config?: import("./smart-environment.js").SettingsConfig | Function;
    /**
     * - Optional display label.
     */
    display_name?: string;
    /**
     * - Optional description.
     */
    description?: string;
    /**
     * - Component version.
     */
    version?: import("./smart-environment.js").SmartEnvVersion;
};
/**
 * @typedef {Object} SmartEnvComponentConfig
 * @property {import('./smart-environment.js').SmartEnvCallable} render - Component render function.
 * @property {import('./smart-environment.js').SettingsConfig|Function} [settings_config] - Optional component settings schema or resolver.
 * @property {string} [display_name] - Optional display label.
 * @property {string} [description] - Optional description.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Component version.
 */
export const SmartEnvComponentConfig: {};
export type SmartEnvComponentMap = {
    [x: string]: SmartEnvComponentConfig;
};
/**
 * @typedef {Object.<string, SmartEnvComponentConfig>} SmartEnvComponentMap
 * @description Flat component map keyed by snake_case component id.
 */
export const SmartEnvComponentMap: {};
export type SmartComponentData = {
    /**
     * - Stable component key including scope, version, and hash.
     */
    key?: string;
    /**
     * - Scope key used to resolve the component.
     */
    scope_key?: string;
    /**
     * - Component id within the scope.
     */
    component_key?: string;
    /**
     * - Render function version.
     */
    version?: number;
    /**
     * - Hash of the render function source.
     */
    hash?: string;
};
/**
 * @typedef {Object} SmartComponentData
 * @property {string} [key] - Stable component key including scope, version, and hash.
 * @property {string} [scope_key] - Scope key used to resolve the component.
 * @property {string} [component_key] - Component id within the scope.
 * @property {number} [version] - Render function version.
 * @property {string} [hash] - Hash of the render function source.
 */
export const SmartComponentData: {};
