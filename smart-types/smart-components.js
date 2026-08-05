/**
 * @typedef {Object} SmartEnvComponentConfig
 * @property {import('./smart-environment.js').SmartEnvCallable} render - Component render function.
 * @property {import('./smart-environment.js').SettingsConfig|((...args: never[]) => import('./smart-environment.js').SettingsConfig)} [settings_config] - Optional component settings schema or resolver.
 * @property {string} [display_name] - Optional display label.
 * @property {string} [description] - Optional description.
 * @property {string} [display_description] - Optional description alias.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Component version.
 */
export const SmartEnvComponentConfig = {};

/**
 * @typedef {Object.<string, SmartEnvComponentConfig>} SmartEnvComponentMap
 * @description Flat component map keyed by snake_case component id.
 */
export const SmartEnvComponentMap = {};

/**
 * Canonical SmartComponents collection surface used by render consumers.
 *
 * @template [TScope=unknown]
 * @template [TOptions=Object.<string, unknown>]
 * @typedef {Object} SmartComponents
 * @property {(component_key: string, scope: TScope, opts?: TOptions) => Promise<HTMLElement|DocumentFragment>} render_component - Renders the best matching component.
 */
export const SmartComponents = {};

/**
 * @typedef {Object} SmartComponentData
 * @property {string} [key] - Stable component key including scope, version, and hash.
 * @property {string} [scope_key] - Scope key used to resolve the component.
 * @property {string} [component_key] - Component id within the scope.
 * @property {number} [version] - Render function version.
 * @property {string} [hash] - Hash of the render function source.
 */
export const SmartComponentData = {};
