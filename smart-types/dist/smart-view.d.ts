export type SmartViewScope = {
    [x: string]: any;
};
/**
 * @typedef {Object.<string, *>} SmartViewScope
 * @property {string} [key] - Scope key used by component/render helpers.
 * @property {Object.<string, *>} [settings] - Settings object rendered by settings components.
 * @property {Object.<string, *>} [actions] - Action callbacks available to rendered controls.
 * @property {import('./smart-collections.js').CollectionEnv} [env] - Smart Environment instance.
 */
export const SmartViewScope: {};
export type SmartViewOptions = {
    /**
     * - View adapter class.
     */
    adapter?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Host application or plugin object.
     */
    main?: any;
    /**
     * - Document used for fragment creation.
     */
    document?: Document;
};
/**
 * @typedef {Object} SmartViewOptions
 * @property {import('./smart-environment.js').SmartEnvClass} [adapter] - View adapter class.
 * @property {*} [main] - Host application or plugin object.
 * @property {Document} [document] - Document used for fragment creation.
 */
export const SmartViewOptions: {};
export type SmartViewSettingDataset = {
    /**
     * - Dot path into the settings object.
     */
    setting?: string;
    /**
     * - Setting control type.
     */
    type?: string;
    /**
     * - Display name.
     */
    name?: string;
    /**
     * - Display description.
     */
    description?: string;
    /**
     * - Serialized current value.
     */
    value?: string;
    /**
     * - Serialized default value.
     */
    default?: string;
    /**
     * - Input placeholder.
     */
    placeholder?: string;
    /**
     * - Serialized dropdown options.
     */
    options?: string;
    /**
     * - Path to callback that returns dropdown options.
     */
    optionsCallback?: string;
    /**
     * - Path to setting change callback.
     */
    callback?: string;
    /**
     * - Optional inline button text.
     */
    button?: string;
    /**
     * - Required marker.
     */
    required?: string;
    /**
     * - Disabled marker.
     */
    disabled?: string;
};
/**
 * @typedef {Object} SmartViewSettingDataset
 * @property {string} [setting] - Dot path into the settings object.
 * @property {string} [type] - Setting control type.
 * @property {string} [name] - Display name.
 * @property {string} [description] - Display description.
 * @property {string} [value] - Serialized current value.
 * @property {string} [default] - Serialized default value.
 * @property {string} [placeholder] - Input placeholder.
 * @property {string} [options] - Serialized dropdown options.
 * @property {string} [optionsCallback] - Path to callback that returns dropdown options.
 * @property {string} [callback] - Path to setting change callback.
 * @property {string} [button] - Optional inline button text.
 * @property {string} [required] - Required marker.
 * @property {string} [disabled] - Disabled marker.
 */
export const SmartViewSettingDataset: {};
export type SmartViewSettingElement = HTMLElement & {
    dataset: SmartViewSettingDataset;
};
/**
 * @typedef {HTMLElement & {dataset: SmartViewSettingDataset}} SmartViewSettingElement
 */
export const SmartViewSettingElement: {};
export type SmartViewSettingControl = {
    /**
     * - Primary input element.
     */
    inputEl?: HTMLElement;
    /**
     * - Dropdown select element.
     */
    selectEl?: HTMLElement;
    /**
     * - Programmatically set the control value.
     */
    setValue?: (value: any) => void;
    /**
     * - Get the current control value.
     */
    getValue?: () => any;
    /**
     * - Register a change callback.
     */
    onChange?: (callback: (arg0: any) => void) => void;
    /**
     * - Register a click callback.
     */
    onClick?: (callback: (arg0: MouseEvent) => void) => void;
};
/**
 * @typedef {Object} SmartViewSettingControl
 * @property {HTMLElement} [inputEl] - Primary input element.
 * @property {HTMLElement} [selectEl] - Dropdown select element.
 * @property {(value: *) => void} [setValue] - Programmatically set the control value.
 * @property {() => *} [getValue] - Get the current control value.
 * @property {(callback: function(*): void) => void} [onChange] - Register a change callback.
 * @property {(callback: function(MouseEvent): void) => void} [onClick] - Register a click callback.
 */
export const SmartViewSettingControl: {};
export type SmartViewSettingConfigurator = (control: SmartViewSettingControl) => void;
export function SmartViewSettingConfigurator(): void;
export type SmartViewSettingRenderer = (elm: SmartViewSettingElement, path: string, value: any, scope: SmartViewScope, settings_scope?: {
    [x: string]: any;
}) => any;
export function SmartViewSettingRenderer(): void;
export type SmartViewSettingRendererMap = {
    [x: string]: SmartViewSettingRenderer;
};
/**
 * @typedef {Object.<string, SmartViewSettingRenderer>} SmartViewSettingRendererMap
 * @description Setting renderers keyed by setting type.
 */
export const SmartViewSettingRendererMap: {};
export type SmartViewRenderParams = {
    /**
     * - HTML string to render.
     */
    html: string;
    /**
     * - Render scope.
     */
    scope?: SmartViewScope;
    /**
     * - Render options.
     */
    opts?: {
        [x: string]: any;
    };
};
/**
 * @typedef {Object} SmartViewRenderParams
 * @property {string} html - HTML string to render.
 * @property {SmartViewScope} [scope] - Render scope.
 * @property {Object.<string, *>} [opts] - Render options.
 */
export const SmartViewRenderParams: {};
