export type SmartNoticeAction = {
    /**
     * - Button text.
     */
    text?: string;
    /**
     * - Action callback.
     */
    callback?: (arg0: any) => Promise<void> | void;
    /**
     * - Host callback/action key.
     */
    callback_key?: string;
    /**
     * - Callback payload.
     */
    payload?: any;
};
/**
 * @typedef {Object} SmartNoticeAction
 * @property {string} [text] - Button text.
 * @property {function(*): Promise<void>|void} [callback] - Action callback.
 * @property {string} [callback_key] - Host callback/action key.
 * @property {*} [payload] - Callback payload.
 */
export const SmartNoticeAction: {};
export type SmartNoticeConfig = {
    /**
     * - Notice key.
     */
    key?: string;
    /**
     * - Notice level or category.
     */
    level?: string;
    /**
     * - Notice message template.
     */
    message?: string;
    /**
     * - Notice description template.
     */
    description?: string;
    /**
     * - Display timeout in milliseconds.
     */
    timeout?: number;
    /**
     * - Optional action buttons.
     */
    actions?: SmartNoticeAction[];
    /**
     * - Factory used to create a rendered notice.
     */
    create?: (arg0: {
        [x: string]: any;
    }) => any;
};
/**
 * @typedef {Object} SmartNoticeConfig
 * @property {string} [key] - Notice key.
 * @property {string} [level] - Notice level or category.
 * @property {string} [message] - Notice message template.
 * @property {string} [description] - Notice description template.
 * @property {number} [timeout] - Display timeout in milliseconds.
 * @property {SmartNoticeAction[]} [actions] - Optional action buttons.
 * @property {function(Object.<string, *>): *} [create] - Factory used to create a rendered notice.
 */
export const SmartNoticeConfig: {};
export type SmartNoticeMap = {
    [x: string]: SmartNoticeConfig;
};
/**
 * @typedef {Object.<string, SmartNoticeConfig>} SmartNoticeMap
 * @description Notice definitions keyed by notice id.
 */
export const SmartNoticeMap: {};
export type SmartNoticeCreateOptions = {
    /**
     * - Message override or interpolation value.
     */
    message?: string;
    /**
     * - Description override or interpolation value.
     */
    description?: string;
    /**
     * - Timeout override.
     */
    timeout?: number;
};
/**
 * @typedef {Object} SmartNoticeCreateOptions
 * @property {string} [message] - Message override or interpolation value.
 * @property {string} [description] - Description override or interpolation value.
 * @property {number} [timeout] - Timeout override.
 */
export const SmartNoticeCreateOptions: {};
