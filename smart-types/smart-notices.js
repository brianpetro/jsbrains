/**
 * @typedef {Object} SmartNoticeAction
 * @property {string} [text] - Button text.
 * @property {function(*): Promise<void>|void} [callback] - Action callback.
 * @property {string} [callback_key] - Host callback/action key.
 * @property {*} [payload] - Callback payload.
 */
export const SmartNoticeAction = {};

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
export const SmartNoticeConfig = {};

/**
 * @typedef {Object.<string, SmartNoticeConfig>} SmartNoticeMap
 * @description Notice definitions keyed by notice id.
 */
export const SmartNoticeMap = {};

/**
 * @typedef {Object} SmartNoticeCreateOptions
 * @property {string} [message] - Message override or interpolation value.
 * @property {string} [description] - Description override or interpolation value.
 * @property {number} [timeout] - Timeout override.
 */
export const SmartNoticeCreateOptions = {};
