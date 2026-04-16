/**
 * @typedef {Object} SmartCompletionChatModelRef
 * @property {string} [platform_key] - Provider key captured for the completion response.
 * @property {string} [model_key] - Provider model key captured for the completion response.
 * @property {string} [chat_completion_model_key] - Stored chat_completion_models item key.
 */
export const SmartCompletionChatModelRef = {};

/**
 * @typedef {Object} SmartCompletionResponseRecord
 * @property {number} timestamp - Epoch milliseconds when the response was stored.
 * @property {string} [id] - Provider response id.
 * @property {string} [object] - Provider response object type.
 * @property {number} [created] - Provider-created timestamp.
 * @property {string} [model] - Provider model identifier.
 * @property {Array<import('./smart-chat-model.js').ChatModelChoice>} choices - Normalized response choices.
 * @property {import('./smart-chat-model.js').ChatModelUsage} [usage] - Token usage metadata.
 * @property {Object.<string, *>} [raw] - Raw provider payload or accumulated stream payload.
 */
export const SmartCompletionResponseRecord = {};

/**
 * @typedef {Object} SmartCompletionState
 * @property {import('./smart-chat-model.js').ChatModelRequest} request - Normalized chat-model request payload.
 * @property {Array<import('./smart-completions.js').SmartCompletionResponseRecord>} responses - Stored completion responses.
 * @property {import('./smart-completions.js').SmartCompletionChatModelRef} [chat_model] - Captured model reference for the stored response.
 * @property {Object.<string, *>} [error] - Normalized completion error payload.
 */
export const SmartCompletionState = {};

/**
 * @typedef {Object} SmartCompletionData
 * @property {string} [key] - Stable completion key.
 * @property {string} [user_message] - User-authored message inserted by SmartCompletionUserAdapter.
 * @property {string} [system_message] - System prompt inserted by SmartCompletionSystemAdapter.
 * @property {boolean} [new_user_message] - Whether to force a new user message wrapper.
 * @property {string} [context_key] - SmartContext key used by ContextCompletionAdapter.
 * @property {string} [chat_completion_model_key] - chat_completion_models item key override.
 * @property {string} [action_key] - Smart action key used by ActionCompletionAdapter.
 * @property {Object.<string, *>} [action_opts] - Smart action argument defaults.
 * @property {string} [action_xml_key] - Smart action key used by ActionXmlCompletionAdapter.
 * @property {Object.<string, *>} [smart_actions] - Smart action toggles stored on the completion.
 * @property {Object.<string, *>} [actions] - Executed action results keyed by action name.
 * @property {import('./smart-completions.js').SmartCompletionState} completion - Request and response state.
 */
export const SmartCompletionData = {};
