export type SmartCompletionChatModelRef = {
    /**
     * - Provider key captured for the completion response.
     */
    platform_key?: string;
    /**
     * - Provider model key captured for the completion response.
     */
    model_key?: string;
    /**
     * - Stored chat_completion_models item key.
     */
    chat_completion_model_key?: string;
};
/**
 * @typedef {Object} SmartCompletionChatModelRef
 * @property {string} [platform_key] - Provider key captured for the completion response.
 * @property {string} [model_key] - Provider model key captured for the completion response.
 * @property {string} [chat_completion_model_key] - Stored chat_completion_models item key.
 */
export const SmartCompletionChatModelRef: {};
export type SmartCompletionResponseRecord = {
    /**
     * - Epoch milliseconds when the response was stored.
     */
    timestamp: number;
    /**
     * - Provider response id.
     */
    id?: string;
    /**
     * - Provider response object type.
     */
    object?: string;
    /**
     * - Provider-created timestamp.
     */
    created?: number;
    /**
     * - Provider model identifier.
     */
    model?: string;
    /**
     * - Normalized response choices.
     */
    choices: Array<import("./smart-chat-model.js").ChatModelChoice>;
    /**
     * - Token usage metadata.
     */
    usage?: import("./smart-chat-model.js").ChatModelUsage;
    /**
     * - Raw provider payload or accumulated stream payload.
     */
    raw?: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {Object} SmartCompletionResponseRecord
 * @property {number} timestamp - Epoch milliseconds when the response was stored.
 * @property {string} [id] - Provider response id.
 * @property {string} [object] - Provider response object type.
 * @property {number} [created] - Provider-created timestamp.
 * @property {string} [model] - Provider model identifier.
 * @property {Array<import('./smart-chat-model.js').ChatModelChoice>} choices - Normalized response choices.
 * @property {import('./smart-chat-model.js').ChatModelUsage} [usage] - Token usage metadata.
 * @property {Object.<string, unknown>} [raw] - Raw provider payload or accumulated stream payload.
 */
export const SmartCompletionResponseRecord: {};
export type SmartCompletionState = {
    /**
     * - Normalized chat-model request payload.
     */
    request: import("./smart-chat-model.js").ChatModelRequest;
    /**
     * - Stored completion responses.
     */
    responses: Array<import("./smart-completions.js").SmartCompletionResponseRecord>;
    /**
     * - Captured model reference for the stored response.
     */
    chat_model?: import("./smart-completions.js").SmartCompletionChatModelRef;
    /**
     * - Normalized completion error payload.
     */
    error?: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {Object} SmartCompletionState
 * @property {import('./smart-chat-model.js').ChatModelRequest} request - Normalized chat-model request payload.
 * @property {Array<import('./smart-completions.js').SmartCompletionResponseRecord>} responses - Stored completion responses.
 * @property {import('./smart-completions.js').SmartCompletionChatModelRef} [chat_model] - Captured model reference for the stored response.
 * @property {Object.<string, unknown>} [error] - Normalized completion error payload.
 */
export const SmartCompletionState: {};
export type SmartCompletionData = {
    /**
     * - Stable completion key.
     */
    key?: string;
    /**
     * - User-authored message inserted by SmartCompletionUserAdapter.
     */
    user_message?: string;
    /**
     * - System prompt inserted by SmartCompletionSystemAdapter.
     */
    system_message?: string;
    /**
     * - Whether to force a new user message wrapper.
     */
    new_user_message?: boolean;
    /**
     * - SmartContext key used by ContextCompletionAdapter.
     */
    context_key?: string;
    /**
     * - chat_completion_models item key override.
     */
    chat_completion_model_key?: string;
    /**
     * - Smart action key used by ActionCompletionAdapter.
     */
    action_key?: string;
    /**
     * - Smart action argument defaults.
     */
    action_opts?: {
        [x: string]: unknown;
    };
    /**
     * - Smart action key used by ActionXmlCompletionAdapter.
     */
    action_xml_key?: string;
    /**
     * - Smart action toggles stored on the completion.
     */
    smart_actions?: {
        [x: string]: unknown;
    };
    /**
     * - Executed action results keyed by action name.
     */
    actions?: {
        [x: string]: unknown;
    };
    /**
     * - Request and response state.
     */
    completion: import("./smart-completions.js").SmartCompletionState;
};
/**
 * @typedef {Object} SmartCompletionData
 * @property {string} [key] - Stable completion key.
 * @property {string} [user_message] - User-authored message inserted by SmartCompletionUserAdapter.
 * @property {string} [system_message] - System prompt inserted by SmartCompletionSystemAdapter.
 * @property {boolean} [new_user_message] - Whether to force a new user message wrapper.
 * @property {string} [context_key] - SmartContext key used by ContextCompletionAdapter.
 * @property {string} [chat_completion_model_key] - chat_completion_models item key override.
 * @property {string} [action_key] - Smart action key used by ActionCompletionAdapter.
 * @property {Object.<string, unknown>} [action_opts] - Smart action argument defaults.
 * @property {string} [action_xml_key] - Smart action key used by ActionXmlCompletionAdapter.
 * @property {Object.<string, unknown>} [smart_actions] - Smart action toggles stored on the completion.
 * @property {Object.<string, unknown>} [actions] - Executed action results keyed by action name.
 * @property {import('./smart-completions.js').SmartCompletionState} completion - Request and response state.
 */
export const SmartCompletionData: {};
