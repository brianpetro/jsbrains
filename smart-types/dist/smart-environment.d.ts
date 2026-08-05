export type SmartEnvVersion = string | number;
/**
 * @typedef {string|number} SmartEnvVersion
 * @description Semantic or numeric version used during Smart Environment config merges.
 */
export const SmartEnvVersion: "";
export type SmartEnvClass = new (...args: never[]) => object;
export function SmartEnvClass(): void;
export type SmartEnvCallable = (...args: never[]) => unknown;
export function SmartEnvCallable(): void;
export type DropdownOption = {
    /**
     * - Stored value for the dropdown option.
     */
    value: string;
    /**
     * - Human-readable label.
     */
    label?: string;
    /**
     * - Deprecated label alias kept for compatibility.
     */
    name?: string;
    /**
     * - Whether the option should be disabled.
     */
    disabled?: boolean;
};
/**
 * @typedef {Object} DropdownOption
 * @property {string} value - Stored value for the dropdown option.
 * @property {string} [label] - Human-readable label.
 * @property {string} [name] - Deprecated label alias kept for compatibility.
 * @property {boolean} [disabled] - Whether the option should be disabled.
 */
export const DropdownOption: {};
export type SettingPath = string;
/**
 * @typedef {string} SettingPath
 * @description A dot-separated path inside the scope settings object.
 */
export const SettingPath: "";
export type SettingConfig = {
    /**
     * - Display name for the setting.
     */
    name?: string;
    /**
     * - Description shown below the name.
     */
    description?: string;
    /**
     * - Supported setting control type.
     */
    type: "button" | "button_with_confirm" | "toggle" | "text" | "string" | "password" | "number" | "dropdown" | "textarea" | "textarea_array" | "slider" | "heading" | "html" | "folder" | "file" | "text-file" | "remove" | "json" | "array" | string;
    /**
     * - Optional settings group heading.
     */
    group?: string;
    /**
     * - Optional control label override.
     */
    label?: string;
    /**
     * - Optional tooltip text.
     */
    tooltip?: string;
    /**
     * - Optional CSS class for scoped styling or gating.
     */
    scope_class?: string;
    /**
     * - Optional button text override.
     */
    btn_text?: string;
    /**
     * - Optional button icon id.
     */
    btn_icon?: string;
    /**
     * - Optional inline button text used by some renderers.
     */
    button?: string;
    /**
     * - Static value for html settings or renderer-specific values.
     */
    value?: unknown;
    /**
     * - Minimum value for sliders or numeric inputs.
     */
    min?: number;
    /**
     * - Maximum value for sliders or numeric inputs.
     */
    max?: number;
    /**
     * - Step value for sliders or numeric inputs.
     */
    step?: number;
    /**
     * - Whether the control is required.
     */
    required?: boolean;
    /**
     * - Whether the control should be disabled.
     */
    disabled?: boolean;
    /**
     * - Whether the control should be hidden.
     */
    hidden?: boolean;
    /**
     * - Whether the setting should be stored through a secrets mechanism.
     */
    secret?: boolean;
    /**
     * - Whether the setting triggers a scope re-render when changed.
     */
    is_scope?: boolean;
    /**
     * - Static dropdown options.
     */
    options?: Array<import("./smart-environment.js").DropdownOption>;
    /**
     * - Deprecated pipe-delimited dropdown option.
     */
    option_1?: string;
    /**
     * - Deprecated pipe-delimited dropdown option.
     */
    option_2?: string;
    /**
     * - Change or click callback.
     */
    callback?: import("./smart-environment.js").SmartEnvCallable | string;
    /**
     * - Optional secondary button callback.
     */
    btn_callback?: import("./smart-environment.js").SmartEnvCallable | string;
    /**
     * - Dropdown options callback returning DropdownOption[].
     */
    options_callback?: import("./smart-environment.js").SmartEnvCallable | string;
    /**
     * - Predicate used by process_settings_config.
     */
    conditional?: import("./smart-environment.js").SmartEnvCallable;
    /**
     * - Default value rendered by the settings UI.
     */
    default?: unknown;
    /**
     * - Input placeholder text.
     */
    placeholder?: string;
};
/**
 * @typedef {Object} SettingConfig
 * @property {string} [name] - Display name for the setting.
 * @property {string} [description] - Description shown below the name.
 * @property {'button'|'button_with_confirm'|'toggle'|'text'|'string'|'password'|'number'|'dropdown'|'textarea'|'textarea_array'|'slider'|'heading'|'html'|'folder'|'file'|'text-file'|'remove'|'json'|'array'|string} type - Supported setting control type.
 * @property {string} [group] - Optional settings group heading.
 * @property {string} [label] - Optional control label override.
 * @property {string} [tooltip] - Optional tooltip text.
 * @property {string} [scope_class] - Optional CSS class for scoped styling or gating.
 * @property {string} [btn_text] - Optional button text override.
 * @property {string} [btn_icon] - Optional button icon id.
 * @property {string} [button] - Optional inline button text used by some renderers.
 * @property {unknown} [value] - Static value for html settings or renderer-specific values.
 * @property {number} [min] - Minimum value for sliders or numeric inputs.
 * @property {number} [max] - Maximum value for sliders or numeric inputs.
 * @property {number} [step] - Step value for sliders or numeric inputs.
 * @property {boolean} [required] - Whether the control is required.
 * @property {boolean} [disabled] - Whether the control should be disabled.
 * @property {boolean} [hidden] - Whether the control should be hidden.
 * @property {boolean} [secret] - Whether the setting should be stored through a secrets mechanism.
 * @property {boolean} [is_scope] - Whether the setting triggers a scope re-render when changed.
 * @property {Array<import('./smart-environment.js').DropdownOption>} [options] - Static dropdown options.
 * @property {string} [option_1] - Deprecated pipe-delimited dropdown option.
 * @property {string} [option_2] - Deprecated pipe-delimited dropdown option.
 * @property {import('./smart-environment.js').SmartEnvCallable|string} [callback] - Change or click callback.
 * @property {import('./smart-environment.js').SmartEnvCallable|string} [btn_callback] - Optional secondary button callback.
 * @property {import('./smart-environment.js').SmartEnvCallable|string} [options_callback] - Dropdown options callback returning DropdownOption[].
 * @property {import('./smart-environment.js').SmartEnvCallable} [conditional] - Predicate used by process_settings_config.
 * @property {unknown} [default] - Default value rendered by the settings UI.
 * @property {string} [placeholder] - Input placeholder text.
 */
export const SettingConfig: {};
export type SettingsConfig = {
    [x: string]: SettingConfig;
};
/**
 * @typedef {Object.<string, SettingConfig>} SettingsConfig
 * @description An object mapping setting paths to their configurations.
 */
export const SettingsConfig: {};
export type SmartEnvAdapterMap = {
    [x: string]: SmartEnvClass;
};
/**
 * @typedef {Object.<string, SmartEnvClass>} SmartEnvAdapterMap
 * @description Named adapter or provider map used by modules and collections.
 */
export const SmartEnvAdapterMap: {};
export type SmartEnvActionConfig = {
    /**
     * - Action handler.
     */
    action: import("./smart-environment.js").SmartEnvCallable;
    /**
     * - Optional action settings schema or resolver.
     */
    settings_config?: import("./smart-environment.js").SettingsConfig | ((...args: never[]) => import("./smart-environment.js").SettingsConfig);
    /**
     * - Optional default action settings.
     */
    default_settings?: {
        [x: string]: unknown;
    };
    /**
     * - Optional display label.
     */
    display_name?: string;
    /**
     * - Optional display description.
     */
    display_description?: string;
    /**
     * - Optional pre-process hook.
     */
    pre_process?: import("./smart-environment.js").SmartEnvCallable;
    /**
     * - Action version.
     */
    version?: import("./smart-environment.js").SmartEnvVersion;
};
/**
 * @typedef {Object} SmartEnvActionConfig
 * @property {import('./smart-environment.js').SmartEnvCallable} action - Action handler.
 * @property {import('./smart-environment.js').SettingsConfig|((...args: never[]) => import('./smart-environment.js').SettingsConfig)} [settings_config] - Optional action settings schema or resolver.
 * @property {Object.<string, unknown>} [default_settings] - Optional default action settings.
 * @property {string} [display_name] - Optional display label.
 * @property {string} [display_description] - Optional display description.
 * @property {import('./smart-environment.js').SmartEnvCallable} [pre_process] - Optional pre-process hook.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Action version.
 */
export const SmartEnvActionConfig: {};
export type SmartEnvActionMap = {
    [x: string]: SmartEnvActionConfig;
};
/**
 * @typedef {Object.<string, SmartEnvActionConfig>} SmartEnvActionMap
 * @description Flat action map keyed by snake_case action id.
 */
export const SmartEnvActionMap: {};
export type SmartEnvCollectionConfig = {
    /**
     * - Collection class.
     */
    class?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Explicit collection key override.
     */
    collection_key?: string;
    /**
     * - Collection item class.
     */
    item_type?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Explicit item type key override.
     */
    item_type_key?: string;
    /**
     * - Collection persistence adapter.
     */
    data_adapter?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Source adapters keyed by extension or adapter id.
     */
    source_adapters?: {
        [x: string]: SmartEnvClass;
    };
    /**
     * - Block adapters keyed by extension or adapter id.
     */
    block_adapters?: {
        [x: string]: SmartEnvClass;
    };
    /**
     * - Additional named adapters.
     */
    adapters?: import("./smart-environment.js").SmartEnvAdapterMap;
    /**
     * - Collection content parser pipeline.
     */
    content_parsers?: import("./smart-environment.js").SmartEnvCallable[];
    /**
     * - Relative collection load order.
     */
    load_order?: number;
    /**
     * - Whether to process embed queue during load.
     */
    process_embed_queue?: boolean;
    /**
     * - Collection settings schema or resolver.
     */
    settings_config?: import("./smart-environment.js").SettingsConfig | ((...args: never[]) => import("./smart-environment.js").SettingsConfig);
    /**
     * - Collection default settings values.
     */
    default_settings?: {
        [x: string]: unknown;
    };
    /**
     * - Collection config or class version.
     */
    version?: import("./smart-environment.js").SmartEnvVersion;
};
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
 * @property {import('./smart-environment.js').SettingsConfig|((...args: never[]) => import('./smart-environment.js').SettingsConfig)} [settings_config] - Collection settings schema or resolver.
 * @property {Object.<string, unknown>} [default_settings] - Collection default settings values.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Collection config or class version.
 */
export const SmartEnvCollectionConfig: {};
export type SmartEnvCollectionDefinition = (SmartEnvClass | SmartEnvCollectionConfig);
/**
 * @typedef {(SmartEnvClass|SmartEnvCollectionConfig)} SmartEnvCollectionDefinition
 * @description Collection entry accepted by SmartEnvConfig.collections.
 */
export const SmartEnvCollectionDefinition: {};
export type SmartEnvModuleConfig = {
    /**
     * - Module class.
     */
    class?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Primary adapter class.
     */
    adapter?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Explicit adapter class override.
     */
    adapter_class?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Named adapter or provider map.
     */
    adapters?: import("./smart-environment.js").SmartEnvAdapterMap;
    /**
     * - Module settings schema or resolver.
     */
    settings_config?: import("./smart-environment.js").SettingsConfig | ((...args: never[]) => import("./smart-environment.js").SettingsConfig);
    /**
     * - Module default settings values.
     */
    default_settings?: {
        [x: string]: unknown;
    };
    /**
     * - Module config or class version.
     */
    version?: import("./smart-environment.js").SmartEnvVersion;
};
/**
 * @typedef {Object} SmartEnvModuleConfig
 * @property {import('./smart-environment.js').SmartEnvClass} [class] - Module class.
 * @property {import('./smart-environment.js').SmartEnvClass} [adapter] - Primary adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [adapter_class] - Explicit adapter class override.
 * @property {import('./smart-environment.js').SmartEnvAdapterMap} [adapters] - Named adapter or provider map.
 * @property {import('./smart-environment.js').SettingsConfig|((...args: never[]) => import('./smart-environment.js').SettingsConfig)} [settings_config] - Module settings schema or resolver.
 * @property {Object.<string, unknown>} [default_settings] - Module default settings values.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Module config or class version.
 */
export const SmartEnvModuleConfig: {};
export type SmartEnvModuleDefinition = (SmartEnvClass | SmartEnvModuleConfig);
/**
 * @typedef {(SmartEnvClass|SmartEnvModuleConfig)} SmartEnvModuleDefinition
 * @description Module entry accepted by SmartEnvConfig.modules.
 */
export const SmartEnvModuleDefinition: {};
export type SmartEnvItemConfig = {
    /**
     * - Item class.
     */
    class?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Item-scoped action map.
     */
    actions?: {
        [x: string]: SmartEnvActionConfig;
    };
    /**
     * - Item settings schema or resolver.
     */
    settings_config?: import("./smart-environment.js").SettingsConfig | ((...args: never[]) => import("./smart-environment.js").SettingsConfig);
    /**
     * - Item default settings values.
     */
    default_settings?: {
        [x: string]: unknown;
    };
    /**
     * - Item config or class version.
     */
    version?: import("./smart-environment.js").SmartEnvVersion;
};
/**
 * @typedef {Object} SmartEnvItemConfig
 * @property {import('./smart-environment.js').SmartEnvClass} [class] - Item class.
 * @property {Object.<string, import('./smart-environment.js').SmartEnvActionConfig>} [actions] - Item-scoped action map.
 * @property {import('./smart-environment.js').SettingsConfig|((...args: never[]) => import('./smart-environment.js').SettingsConfig)} [settings_config] - Item settings schema or resolver.
 * @property {Object.<string, unknown>} [default_settings] - Item default settings values.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Item config or class version.
 */
export const SmartEnvItemConfig: {};
export type SmartEnvItemDefinition = (SmartEnvClass | SmartEnvItemConfig);
/**
 * @typedef {(SmartEnvClass|SmartEnvItemConfig)} SmartEnvItemDefinition
 * @description Item entry accepted by SmartEnvConfig.items.
 */
export const SmartEnvItemDefinition: {};
export type SmartEnvModalConfig = {
    /**
     * - Modal class.
     */
    class: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Default suggest scopes for suggest modals.
     */
    default_suggest_action_keys?: string[];
    /**
     * - Modal version.
     */
    version?: import("./smart-environment.js").SmartEnvVersion;
};
/**
 * @typedef {Object} SmartEnvModalConfig
 * @property {import('./smart-environment.js').SmartEnvClass} class - Modal class.
 * @property {string[]} [default_suggest_action_keys] - Default suggest scopes for suggest modals.
 * @property {import('./smart-environment.js').SmartEnvVersion} [version] - Modal version.
 */
export const SmartEnvModalConfig: {};
export type SmartEnvConfig = {
    /**
     * - Relative folder used for Smart Environment data.
     */
    env_data_dir?: string;
    /**
     * - Base environment path.
     */
    env_path?: string;
    /**
     * - Config version used during merge precedence checks.
     */
    version?: import("./smart-environment.js").SmartEnvVersion;
    /**
     * - Collection registry.
     */
    collections?: {
        [x: string]: SmartEnvCollectionDefinition;
    };
    /**
     * - Module registry.
     */
    modules?: {
        [x: string]: SmartEnvModuleDefinition;
    };
    /**
     * - Canonical item registry.
     */
    items?: {
        [x: string]: SmartEnvItemDefinition;
    };
    /**
     * - Flat component registry or legacy scoped component map.
     */
    components?: {
        [x: string]: import("./smart-components.js").SmartEnvComponentConfig | {
            [x: string]: import("./smart-components.js").SmartEnvComponentConfig;
        };
    };
    /**
     * - Flat action registry or legacy scoped action map.
     */
    actions?: {
        [x: string]: SmartEnvActionConfig | {
            [x: string]: SmartEnvActionConfig;
        };
    };
    /**
     * - Optional modal registry.
     */
    modals?: {
        [x: string]: SmartEnvModalConfig;
    };
    /**
     * - Default runtime settings values.
     */
    default_settings?: {
        [x: string]: unknown;
    };
    /**
     * - Delay before Smart Environment auto-load begins.
     */
    env_start_wait_time?: number;
};
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
 * @property {Object.<string, unknown>} [default_settings] - Default runtime settings values.
 * @property {number} [env_start_wait_time] - Delay before Smart Environment auto-load begins.
 */
export const SmartEnvConfig: {};
export type SmartEnvCore = {
    /**
     * - Runtime settings store, narrowed by the environment extension type.
     */
    settings: unknown;
    /**
     * - Runtime event bus, narrowed by the environment extension type.
     */
    events: unknown;
    /**
     * - Merged Smart Environment configuration.
     */
    config: import("./smart-environment.js").SmartEnvConfig;
    /**
     * - Current environment lifecycle state.
     */
    state: string;
    /**
     * - Collection load-state registry.
     */
    collections: {
        [x: string]: string;
    };
    /**
     * - Normalized runtime environment options.
     */
    opts?: {
        [x: string]: unknown;
    };
    /**
     * - Defines an environment getter on a target object.
     */
    create_env_getter: (target: object) => void;
    /**
     * - Unregisters a main from the shared environment.
     */
    unload_main?: (main: object) => void;
};
/**
 * @typedef {Object} SmartEnvCore
 * @property {unknown} settings - Runtime settings store, narrowed by the environment extension type.
 * @property {unknown} events - Runtime event bus, narrowed by the environment extension type.
 * @property {import('./smart-environment.js').SmartEnvConfig} config - Merged Smart Environment configuration.
 * @property {string} state - Current environment lifecycle state.
 * @property {Object.<string, string|null>} collections - Collection load-state registry.
 * @property {Object.<string, unknown>} [opts] - Normalized runtime environment options.
 * @property {(target: object) => void} create_env_getter - Defines an environment getter on a target object.
 * @property {(main: object) => void} [unload_main] - Unregisters a main from the shared environment.
 */
export const SmartEnvCore: {};
/**
 * Canonical Smart Environment instance type. Consumers extend the shared core
 * with only their environment-specific collections, modules, and host APIs.
 */
export type SmartEnv<TExtensions = {
    [x: string]: unknown;
}> = Omit<import("./smart-environment.js").SmartEnvCore, keyof TExtensions> & TExtensions;
/**
 * Canonical Smart Environment instance type. Consumers extend the shared core
 * with only their environment-specific collections, modules, and host APIs.
 *
 * @template [TExtensions=Object.<string, unknown>]
 * @typedef {Omit<import('./smart-environment.js').SmartEnvCore, keyof TExtensions> & TExtensions} SmartEnv
 */
export const SmartEnv: {};
