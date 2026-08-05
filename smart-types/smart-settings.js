/**
 * @typedef {'set'|'delete'} SettingsChangeType
 * @description Mutation type emitted by SmartSettings.
 */
export const SettingsChangeType = '';

/**
 * @typedef {Object} SettingsChange
 * @property {import('./smart-settings.js').SettingsChangeType} type - Mutation type.
 * @property {Array<(string|number|symbol)>} path - Property path segments.
 * @property {unknown} [value] - New value for set operations.
 * @property {unknown} [previous_value] - Previous value before the mutation.
 */
export const SettingsChange = {};

/**
 * @typedef {Object} SettingsChangedEvent
 * @property {import('./smart-settings.js').SettingsChangeType} type - Mutation type.
 * @property {Array<(string|number|symbol)>} path - Property path segments.
 * @property {string} path_string - Dot-joined path string.
 * @property {unknown} [value] - New value for set operations.
 * @property {unknown} [previous_value] - Previous value before the mutation.
 */
export const SettingsChangedEvent = {};

/**
 * @typedef {Object} SettingsEventsBus
 * @property {function(string, unknown): void} emit - Event bus emit function used by SmartSettings.
 */
export const SettingsEventsBus = {};

/**
 * @typedef {Object} SmartSettingsCreateOptions
 * @property {number} [save_delay_ms] - Debounced save delay in milliseconds.
 * @property {import('./smart-settings.js').SettingsEventsBus} [events] - Optional events bus override.
 * @property {function(string, unknown): void} [emit] - Optional emit shortcut used when events bus is not supplied.
 * @property {function(Object.<string, unknown>): Promise<void>|void} [save] - Optional save override.
 * @property {function(): Promise<Object.<string, unknown>>|Object.<string, unknown>} [load] - Optional load override.
 */
export const SmartSettingsCreateOptions = {};
