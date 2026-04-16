/**
 * @typedef {Object} ChatModelMessageTextPart
 * @property {'text'} type - Text content discriminator.
 * @property {string} text - Text payload.
 */
export const ChatModelMessageTextPart = {};

/**
 * @typedef {Object} ChatModelMessageImagePart
 * @property {'image_url'} type - Image content discriminator.
 * @property {{url: string}} image_url - Image URL payload.
 */
export const ChatModelMessageImagePart = {};

/**
 * @typedef {Object} ChatModelMessageFilePart
 * @property {'file'} type - File content discriminator.
 * @property {{filename: string, file_data: string}} file - File payload for providers that accept inline files.
 */
export const ChatModelMessageFilePart = {};

/**
 * @typedef {(ChatModelMessageTextPart|ChatModelMessageImagePart|ChatModelMessageFilePart)} ChatModelMessageContentPart
 * @description Supported structured content parts used in normalized chat requests.
 */
export const ChatModelMessageContentPart = {};

/**
 * @typedef {Object} ChatModelToolDefinition
 * @property {'function'} type - Tool type discriminator.
 * @property {Object} function - Tool function metadata.
 * @property {string} function.name - Tool name.
 * @property {string} [function.description] - Tool description.
 * @property {Object.<string, *>} [function.parameters] - JSON schema-like parameter object.
 */
export const ChatModelToolDefinition = {};

/**
 * @typedef {Object} ChatModelToolCall
 * @property {string} [id] - Tool call id when provided by the model.
 * @property {'function'} type - Tool type discriminator.
 * @property {Object} function - Tool function call payload.
 * @property {string} function.name - Tool name.
 * @property {string} function.arguments - Serialized tool arguments.
 */
export const ChatModelToolCall = {};

/**
 * @typedef {Object} ChatModelRequestMessage
 * @property {'system'|'user'|'assistant'|'tool'|'function'} role - Message role.
 * @property {string|Array<import('./smart-chat-model.js').ChatModelMessageContentPart>} content - Message content.
 * @property {string} [name] - Function or tool name for function-role payloads.
 * @property {Array<import('./smart-chat-model.js').ChatModelToolCall>} [tool_calls] - Tool calls attached to an assistant message.
 * @property {string} [tool_call_id] - Tool call id used by tool-role follow-up messages.
 * @property {string} [image_url] - Deprecated shorthand image URL field retained for compatibility.
 */
export const ChatModelRequestMessage = {};

/**
 * @typedef {Object} ChatModelRequest
 * @property {Array<import('./smart-chat-model.js').ChatModelRequestMessage>} messages - Normalized chat history.
 * @property {string} [model] - Provider model override.
 * @property {number} [temperature] - Sampling temperature.
 * @property {number} [max_tokens] - Maximum completion token count.
 * @property {boolean} [stream] - Whether the request should stream partial responses.
 * @property {number} [top_p] - Top-p sampling parameter.
 * @property {number} [presence_penalty] - Presence penalty.
 * @property {number} [frequency_penalty] - Frequency penalty.
 * @property {Array<import('./smart-chat-model.js').ChatModelToolDefinition>} [tools] - Tool definitions available to the model.
 * @property {'auto'|'none'|Object.<string, *>} [tool_choice] - Tool-choice strategy or provider-specific override.
 */
export const ChatModelRequest = {};

/**
 * @typedef {Object} ChatModelResponseMessage
 * @property {'assistant'|'function'|'tool'} role - Normalized response role.
 * @property {string|Array<import('./smart-chat-model.js').ChatModelMessageContentPart>} content - Response content.
 * @property {string} [name] - Function name for function-role responses.
 * @property {Array<import('./smart-chat-model.js').ChatModelToolCall>} [tool_calls] - Tool calls emitted by the model.
 */
export const ChatModelResponseMessage = {};

/**
 * @typedef {Object} ChatModelChoice
 * @property {number} index - Choice index.
 * @property {import('./smart-chat-model.js').ChatModelResponseMessage} message - Normalized response message.
 * @property {'stop'|'length'|'tool_calls'|'content_filter'|'function_call'|string} [finish_reason] - Provider finish reason.
 */
export const ChatModelChoice = {};

/**
 * @typedef {Object} ChatModelUsage
 * @property {number} [prompt_tokens] - Prompt token count.
 * @property {number} [completion_tokens] - Completion token count.
 * @property {number} [total_tokens] - Combined token count.
 */
export const ChatModelUsage = {};

/**
 * @typedef {Object} ChatModelResponse
 * @property {string} [id] - Provider response id.
 * @property {string} [object] - Provider response object type.
 * @property {number} [created] - Epoch seconds or milliseconds from the provider response.
 * @property {string} [model] - Provider model identifier.
 * @property {Array<import('./smart-chat-model.js').ChatModelChoice>} choices - Normalized completion choices.
 * @property {import('./smart-chat-model.js').ChatModelUsage} [usage] - Provider usage data.
 * @property {Object.<string, *>} [raw] - Raw provider response or accumulated streaming payload.
 * @property {Object.<string, *>} [error] - Normalized error payload when completion fails.
 */
export const ChatModelResponse = {};

/**
 * @typedef {Object} ChatModelStreamHandlers
 * @property {function(import('./smart-chat-model.js').ChatModelResponse): Promise<void>|void} [chunk] - Called for partial streaming updates.
 * @property {function(import('./smart-chat-model.js').ChatModelResponse): Promise<void>|void} [done] - Called when streaming completes.
 * @property {function(Object.<string, *>): Promise<void>|void} [error] - Called when streaming fails.
 */
export const ChatModelStreamHandlers = {};
