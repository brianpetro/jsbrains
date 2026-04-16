/**
 * @typedef {Object} SmartEnvComponentConfig
 * @property {import('./smart-environment.js').SmartEnvCallable} render - Component render function.
 * @property {import('./smart-environment.js').SettingsConfig|Function} [settings_config] - Optional component settings schema or resolver.
 * @property {string} [display_name] - Optional display label.
 * @property {string} [description] - Optional description.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Component version.
 */
export const SmartEnvComponentConfig = {};

/**
 * @typedef {Object.<string, SmartEnvComponentConfig>} SmartEnvComponentMap
 * @description Flat component map keyed by snake_case component id.
 */
export const SmartEnvComponentMap = {};

/**
 * @typedef {Object} SmartComponentData
 * @property {string} [key] - Stable component key including scope, version, and hash.
 * @property {string} [scope_key] - Scope key used to resolve the component.
 * @property {string} [component_key] - Component id within the scope.
 * @property {number} [version] - Render function version.
 * @property {string} [hash] - Hash of the render function source.
 */
export const SmartComponentData = {};
