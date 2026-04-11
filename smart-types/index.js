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
 * @example 'models.default_model_key'
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
 * @property {string} [value] - Static HTML value for `html` settings.
 * @property {number} [min] - Minimum value for sliders or numeric inputs.
 * @property {number} [max] - Maximum value for sliders or numeric inputs.
 * @property {number} [step] - Step value for sliders or numeric inputs.
 * @property {boolean} [required] - Whether the control is required.
 * @property {SmartEnvCallable} [callback] - Change or click callback.
 * @property {SmartEnvCallable} [options_callback] - Dropdown options callback returning `DropdownOption[]`.
 */
export const SettingConfig = {};

/**
 * @typedef {Object.<SettingPath, SettingConfig>} SettingsConfig
 * @description An object mapping setting paths to their configurations.
 * @example
 * {
 *   'models.default_model_key': {
 *     name: 'Default Model',
 *     type: 'dropdown',
 *     options_callback: function () { return []; },
 *     description: 'Select the default model to use.'
 *   }
 * }
 */
export const SettingsConfig = {};

/**
 * @typedef {Object.<string, SmartEnvClass>} SmartEnvAdapterMap
 * @description Named adapter or provider map used by modules and collections.
 */
export const SmartEnvAdapterMap = {};

/**
 * @typedef {Object} SmartEnvCollectionConfig
 * @property {SmartEnvClass} [class] - Collection class.
 * @property {string} [collection_key] - Explicit collection key override.
 * @property {SmartEnvClass} [item_type] - Collection item class.
 * @property {string} [item_type_key] - Explicit item type key override.
 * @property {SmartEnvClass} [data_adapter] - Collection persistence adapter.
 * @property {Object.<string, SmartEnvClass>} [source_adapters] - Source adapters keyed by extension or adapter id.
 * @property {Object.<string, SmartEnvClass>} [block_adapters] - Block adapters keyed by extension or adapter id.
 * @property {SmartEnvAdapterMap} [adapters] - Additional named adapters.
 * @property {SmartEnvCallable[]} [content_parsers] - Collection content parser pipeline.
 * @property {number} [load_order] - Relative collection load order.
 * @property {boolean} [process_embed_queue] - Whether to process embed queue during load.
 * @property {SettingsConfig} [settings_config] - Collection settings schema.
 * @property {Object.<string, *>} [default_settings] - Collection default settings values.
 * @property {SmartEnvVersion} [version] - Collection config or class version.
 * @description Collection config used in `SmartEnv.create()` and generated `smart_env.config.js` files. Additional collection-specific keys are allowed.
 */
export const SmartEnvCollectionConfig = {};

/**
 * @typedef {(SmartEnvClass|SmartEnvCollectionConfig)} SmartEnvCollectionDefinition
 * @description Collection entry accepted by `SmartEnvConfig.collections`.
 */
export const SmartEnvCollectionDefinition = {};

/**
 * @typedef {Object} SmartEnvModuleConfig
 * @property {SmartEnvClass} [class] - Module class.
 * @property {SmartEnvClass} [adapter] - Primary adapter class.
 * @property {SmartEnvAdapterMap} [adapters] - Named adapter or provider map.
 * @property {SettingsConfig} [settings_config] - Module settings schema.
 * @property {Object.<string, *>} [default_settings] - Module default settings values.
 * @property {SmartEnvVersion} [version] - Module config or class version.
 * @description Module config used in `SmartEnvConfig.modules`. Additional module-specific keys are allowed.
 */
export const SmartEnvModuleConfig = {};

/**
 * @typedef {(SmartEnvClass|SmartEnvModuleConfig)} SmartEnvModuleDefinition
 * @description Module entry accepted by `SmartEnvConfig.modules`.
 */
export const SmartEnvModuleDefinition = {};

/**
 * @typedef {Object} SmartEnvItemConfig
 * @property {SmartEnvClass} [class] - Item class.
 * @property {Object.<string, SmartEnvActionConfig>} [actions] - Item-scoped action map.
 * @property {SettingsConfig} [settings_config] - Item settings schema.
 * @property {Object.<string, *>} [default_settings] - Item default settings values.
 * @property {SmartEnvVersion} [version] - Item config or class version.
 * @description Canonical item registration shape used by `SmartEnvConfig.items`.
 */
export const SmartEnvItemConfig = {};

/**
 * @typedef {(SmartEnvClass|SmartEnvItemConfig)} SmartEnvItemDefinition
 * @description Item entry accepted by `SmartEnvConfig.items`.
 */
export const SmartEnvItemDefinition = {};

/**
 * @typedef {Object} SmartEnvComponentConfig
 * @property {SmartEnvCallable} render - Component render function.
 * @property {SettingsConfig} [settings_config] - Optional component settings schema.
 * @property {string} [display_name] - Optional display label.
 * @property {string} [description] - Optional description.
 * @property {SmartEnvVersion} [version] - Component version.
 */
export const SmartEnvComponentConfig = {};

/**
 * @typedef {Object.<string, SmartEnvComponentConfig>} SmartEnvComponentMap
 * @description Flat component map keyed by snake_case component id.
 */
export const SmartEnvComponentMap = {};

/**
 * @typedef {Object} SmartEnvActionConfig
 * @property {SmartEnvCallable} action - Action handler.
 * @property {SettingsConfig} [settings_config] - Optional action settings schema.
 * @property {Object.<string, *>} [default_settings] - Optional default action settings.
 * @property {string} [display_name] - Optional display label.
 * @property {string} [display_description] - Optional display description.
 * @property {SmartEnvCallable} [pre_process] - Optional pre-process hook.
 * @property {SmartEnvVersion} [version] - Action version.
 */
export const SmartEnvActionConfig = {};

/**
 * @typedef {Object.<string, SmartEnvActionConfig>} SmartEnvActionMap
 * @description Flat action map keyed by snake_case action id.
 */
export const SmartEnvActionMap = {};

/**
 * @typedef {Object} SmartEnvModalConfig
 * @property {SmartEnvClass} class - Modal class.
 * @property {string[]} [default_suggest_action_keys] - Default suggest scopes for suggest modals.
 * @property {SmartEnvVersion} [version] - Modal version.
 * @description Optional modal registration config used by environment-specific UIs.
 */
export const SmartEnvModalConfig = {};

/**
 * @typedef {Object} SmartEnvConfig
 * @property {string} [env_data_dir] - Relative folder used for Smart Environment data.
 * @property {string} [env_path] - Base environment path.
 * @property {SmartEnvVersion} [version] - Config version used during merge precedence checks.
 * @property {Object.<string, SmartEnvCollectionDefinition>} [collections] - Collection registry.
 * @property {Object.<string, SmartEnvModuleDefinition>} [modules] - Module registry.
 * @property {Object.<string, SmartEnvItemDefinition>} [items] - Canonical item registry.
 * @property {Object.<string, (SmartEnvClass|SmartEnvItemConfig)>} [item_types] - Deprecated compatibility alias for item registration. Prefer `items`.
 * @property {Object.<string, (SmartEnvComponentConfig|SmartEnvComponentMap)>} [components] - Flat component registry or legacy scoped component map.
 * @property {Object.<string, (SmartEnvActionConfig|SmartEnvActionMap)>} [actions] - Flat action registry or legacy scoped action map.
 * @property {Object.<string, SmartEnvModalConfig>} [modals] - Optional modal registry.
 * @property {Object.<string, *>} [default_settings] - Default runtime settings values.
 * @property {number} [env_start_wait_time] - Delay before Smart Environment auto-load begins.
 * @description Runtime Smart Environment config merged by `SmartEnv.create()`. Builder-generated actions and components use flattened snake_case keys. Additional project-specific keys are allowed.
 * @example
 * {
 *   env_path: '',
 *   version: '2.4.1',
 *   collections: {
 *     smart_sources: {
 *       class: SmartSources,
 *       data_adapter: SourcesDataAdapter,
 *       item_type: SmartSource
 *     }
 *   },
 *   modules: {
 *     smart_fs: {
 *       class: SmartFs,
 *       adapter: SmartFsAdapter
 *     }
 *   },
 *   items: {
 *     smart_source: {
 *       class: SmartSource,
 *       version: '1.0.0'
 *     }
 *   },
 *   components: {
 *     settings_smart_env: {
 *       render: render_settings_smart_env
 *     }
 *   },
 *   actions: {
 *     source_open: {
 *       action: source_open
 *     }
 *   }
 * }
 */
export const SmartEnvConfig = {};

/**
 * @typedef {Object} LinkObject
 * @property {string} key - The resolved key of the linked item.
 * @property {string} source_key - The key of the source item that contains this link.
 * @property {number} [bases_row] - If the link is from a Bases embed, this is the row number in the Bases table.
 * @property {boolean} [embedded] - Whether the link is an embedded link.
 * @property {number} [line] - The line number where the link is located in the source file.
 * @property {string} [target] - Original link target before path resolution.
 * @property {string} [title] - Anchor text for the link, if available.
 */
export const LinkObject = {};
