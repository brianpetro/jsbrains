/**
 * @typedef {string|number} SmartEnvVersion
 * @description Semantic or numeric version used during Smart Environment config merges.
 */
export const SmartEnvVersion = '';

/**
 * @typedef {Function} SmartEnvClass
 * @description Constructor or class reference used by Smart Environment config.
 */
export const SmartEnvClass = function () {};

/**
 * @typedef {Function} SmartEnvCallable
 * @description Function reference used for actions, renderers, parsers, callbacks, or hooks.
 */
export const SmartEnvCallable = function () {};

/**
 * @typedef {Object} DropdownOption
 * @property {string} value - Stored value for the dropdown option.
 * @property {string} [label] - Human-readable label.
 * @property {string} [name] - Deprecated label alias kept for compatibility.
 * @property {boolean} [disabled] - Whether the option should be disabled.
 */
export const DropdownOption = {};

/**
 * @typedef {string} SettingPath
 * @description A dot-separated path inside the scope settings object.
 */
export const SettingPath = '';

/**
 * @typedef {Object} SettingConfig
 * @property {string} [name] - Display name for the setting.
 * @property {string} [description] - Description shown below the name.
 * @property {'button'|'toggle'|'text'|'password'|'number'|'dropdown'|'textarea'|'slider'|'heading'|'html'} type - Supported setting control type.
 * @property {string} [group] - Optional settings group heading.
 * @property {string} [label] - Optional control label override.
 * @property {string} [tooltip] - Optional tooltip text.
 * @property {string} [scope_class] - Optional CSS class for scoped styling or gating.
 * @property {string} [btn_text] - Optional button text override.
 * @property {string} [btn_icon] - Optional button icon id.
 * @property {string} [value] - Static HTML value for html settings.
 * @property {number} [min] - Minimum value for sliders or numeric inputs.
 * @property {number} [max] - Maximum value for sliders or numeric inputs.
 * @property {number} [step] - Step value for sliders or numeric inputs.
 * @property {boolean} [required] - Whether the control is required.
 * @property {boolean} [disabled] - Whether the control should be disabled.
 * @property {boolean} [is_scope] - Whether the setting triggers a scope re-render when changed.
 * @property {import('./smart-environment.js').SmartEnvCallable|string} [callback] - Change or click callback.
 * @property {import('./smart-environment.js').SmartEnvCallable|string} [btn_callback] - Optional secondary button callback.
 * @property {import('./smart-environment.js').SmartEnvCallable|string} [options_callback] - Dropdown options callback returning DropdownOption[].
 * @property {import('./smart-environment.js').SmartEnvCallable} [conditional] - Predicate used by process_settings_config.
 * @property {*} [default] - Default value rendered by the settings UI.
 * @property {string} [placeholder] - Input placeholder text.
 */
export const SettingConfig = {};

/**
 * @typedef {Object.<SettingPath, SettingConfig>} SettingsConfig
 * @description An object mapping setting paths to their configurations.
 */
export const SettingsConfig = {};

/**
 * @typedef {Object.<string, SmartEnvClass>} SmartEnvAdapterMap
 * @description Named adapter or provider map used by modules and collections.
 */
export const SmartEnvAdapterMap = {};

/**
 * @typedef {Object} SmartEnvActionConfig
 * @property {import('./smart-environment.js').SmartEnvCallable} action - Action handler.
 * @property {import('./smart-environment.js').SettingsConfig|Function} [settings_config] - Optional action settings schema or resolver.
 * @property {Object.<string, *>} [default_settings] - Optional default action settings.
 * @property {string} [display_name] - Optional display label.
 * @property {string} [display_description] - Optional display description.
 * @property {import('./smart-environment.js').SmartEnvCallable} [pre_process] - Optional pre-process hook.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Action version.
 */
export const SmartEnvActionConfig = {};

/**
 * @typedef {Object.<string, SmartEnvActionConfig>} SmartEnvActionMap
 * @description Flat action map keyed by snake_case action id.
 */
export const SmartEnvActionMap = {};

/**
 * @typedef {Object} SmartEnvCollectionConfig
 * @property {import('./smart-environment.js').SmartEnvClass} [class] - Collection class.
 * @property {string} [collection_key] - Explicit collection key override.
 * @property {import('./smart-environment.js').SmartEnvClass} [item_type] - Collection item class.
 * @property {string} [item_type_key] - Explicit item type key override.
 * @property {import('./smart-environment.js').SmartEnvClass} [data_adapter] - Collection persistence adapter.
 * @property {Object.<string, import('./smart-environment.js').SmartEnvClass>} [source_adapters] - Source adapters keyed by extension or adapter id.
 * @property {Object.<string, import('./smart-environment.js').SmartEnvClass>} [block_adapters] - Block adapters keyed by extension or adapter id.
 * @property {import('./smart-environment.js').SmartEnvAdapterMap} [adapters] - Additional named adapters.
 * @property {import('./smart-environment.js').SmartEnvCallable[]} [content_parsers] - Collection content parser pipeline.
 * @property {number} [load_order] - Relative collection load order.
 * @property {boolean} [process_embed_queue] - Whether to process embed queue during load.
 * @property {import('./smart-environment.js').SettingsConfig|Function} [settings_config] - Collection settings schema or resolver.
 * @property {Object.<string, *>} [default_settings] - Collection default settings values.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Collection config or class version.
 */
export const SmartEnvCollectionConfig = {};

/**
 * @typedef {(SmartEnvClass|SmartEnvCollectionConfig)} SmartEnvCollectionDefinition
 * @description Collection entry accepted by SmartEnvConfig.collections.
 */
export const SmartEnvCollectionDefinition = {};

/**
 * @typedef {Object} SmartEnvModuleConfig
 * @property {import('./smart-environment.js').SmartEnvClass} [class] - Module class.
 * @property {import('./smart-environment.js').SmartEnvClass} [adapter] - Primary adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [adapter_class] - Explicit adapter class override.
 * @property {import('./smart-environment.js').SmartEnvAdapterMap} [adapters] - Named adapter or provider map.
 * @property {import('./smart-environment.js').SettingsConfig|Function} [settings_config] - Module settings schema or resolver.
 * @property {Object.<string, *>} [default_settings] - Module default settings values.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Module config or class version.
 */
export const SmartEnvModuleConfig = {};

/**
 * @typedef {(SmartEnvClass|SmartEnvModuleConfig)} SmartEnvModuleDefinition
 * @description Module entry accepted by SmartEnvConfig.modules.
 */
export const SmartEnvModuleDefinition = {};

/**
 * @typedef {Object} SmartEnvItemConfig
 * @property {import('./smart-environment.js').SmartEnvClass} [class] - Item class.
 * @property {Object.<string, import('./smart-environment.js').SmartEnvActionConfig>} [actions] - Item-scoped action map.
 * @property {import('./smart-environment.js').SettingsConfig|Function} [settings_config] - Item settings schema or resolver.
 * @property {Object.<string, *>} [default_settings] - Item default settings values.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Item config or class version.
 */
export const SmartEnvItemConfig = {};

/**
 * @typedef {(SmartEnvClass|SmartEnvItemConfig)} SmartEnvItemDefinition
 * @description Item entry accepted by SmartEnvConfig.items.
 */
export const SmartEnvItemDefinition = {};

/**
 * @typedef {Object} SmartEnvModalConfig
 * @property {import('./smart-environment.js').SmartEnvClass} class - Modal class.
 * @property {string[]} [default_suggest_action_keys] - Default suggest scopes for suggest modals.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Modal version.
 */
export const SmartEnvModalConfig = {};

/**
 * @typedef {Object} SmartEnvConfig
 * @property {string} [env_data_dir] - Relative folder used for Smart Environment data.
 * @property {string} [env_path] - Base environment path.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Config version used during merge precedence checks.
 * @property {Object.<string, import('./smart-environment.js').SmartEnvCollectionDefinition>} [collections] - Collection registry.
 * @property {Object.<string, import('./smart-environment.js').SmartEnvModuleDefinition>} [modules] - Module registry.
 * @property {Object.<string, import('./smart-environment.js').SmartEnvItemDefinition>} [items] - Canonical item registry.
 * @property {Object.<string, (import('./smart-components.js').SmartEnvComponentConfig|import('./smart-components.js').SmartEnvComponentMap)>} [components] - Flat component registry or legacy scoped component map.
 * @property {Object.<string, (import('./smart-environment.js').SmartEnvActionConfig|import('./smart-environment.js').SmartEnvActionMap)>} [actions] - Flat action registry or legacy scoped action map.
 * @property {Object.<string, import('./smart-environment.js').SmartEnvModalConfig>} [modals] - Optional modal registry.
 * @property {Object.<string, *>} [default_settings] - Default runtime settings values.
 * @property {number} [env_start_wait_time] - Delay before Smart Environment auto-load begins.
 */
export const SmartEnvConfig = {};
