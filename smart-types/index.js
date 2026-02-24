/**
 * @typedef {Object.<SettingPath, SettingConfig>} SettingsConfig
 * @description An object mapping setting paths to their configurations.
 * @example
 * {
 *   'models.default_model_key': {
 *      name: 'Default Model',
 *      type: 'dropdown',
 *      options_callback: function() { ... },
 *      description: 'Select the default model to use.'
 *   }
 * }
 */
export const SettingsConfig = {};

/**
 * @typedef {Object} SettingConfig
 * @property {string} name - The display name of the setting.
 * @property {string} [description] - A description of the setting.
 * @property {string} type - The type of the setting ('button', 'toggle', 'number', 'dropdown').
 * @property {function} [callback] - The callback function for button type settings.
 * @property {function} [options_callback] - The function to get options for dropdown type settings.
 * @property {string} [scope_class] - Additional CSS class for scoping the setting.
 */
export const SettingConfig = {};

/**
 * @typedef {string} SettingPath
 * @description A dot-separated string representing the path to a setting in the scope's settings object.
 * @example 'models.default_model_key'
 */
export const SettingPath = '';



/**
 * @typedef {Object} LinkObject
 * @property {string} key - The key of the linked item.
 * @property {number} [bases_row] - If the link is from a Bases embed, this indicates the row number in the Bases table.
 * @property {boolean} [embedded] - Whether the link is an embedded link.
 * @property {number} [line] - The line number where the link is located in the source file.
 * @property {string} [target] - The original link target (e.g., Obsidian link) before path resolution.
 * @property {boolean} [title] - Anchor text for the link, if available.
 */
export const LinkObject = {};