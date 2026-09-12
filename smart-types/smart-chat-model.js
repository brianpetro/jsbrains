/**
 * @typedef {Object} ChatModelMessageTextPart
 * @property {'text'} type - Text content discriminator.
 * @property {string} text - Text payload.
 */
export const ChatModelMessageTextPart = {};

/**
 * @typedef {Object} ChatModelMessageImagePart
 * @property {'image_url'} type - Image content discriminator.
 * @property {{url: string, detail?: string}} image_url - Image URL payload.
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
 * @property {Object.<string, unknown>} [function.parameters] - JSON schema-like parameter object.
 * @property {boolean} [function.strict] - Explicit function-schema strictness. Responses preserves non-strict behavior when omitted.
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
 * @property {'system'|'developer'|'user'|'assistant'|'tool'|'function'} role - Message role.
 * @property {string|Array<import('./smart-chat-model.js').ChatModelMessageContentPart>|null} content - Message content, or null for an assistant tool call.
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
 * @property {'auto'|'responses'|'completions'} [api_format] - Native OpenAI transport override; not sent to the provider.
 * @property {string} [reasoning_effort] - Request-level reasoning effort, overriding configured effort when nonempty.
 * @property {string} [verbosity] - Request-level response verbosity.
 * @property {number} [max_completion_tokens] - Output cap including reasoning; mapped to max_output_tokens for Responses.
 * @property {boolean} [parallel_tool_calls] - Whether parallel function calls are allowed.
 * @property {boolean} [store] - Responses storage opt-in; defaults to false.
 * @property {Object.<string, unknown>} [response_format] - Text/JSON output format; mapped to Responses text.format.
 * @property {number} [temperature] - Sampling temperature.
 * @property {number} [max_tokens] - Maximum completion token count.
 * @property {boolean} [stream] - Whether the request should stream partial responses.
 * @property {number} [top_p] - Top-p sampling parameter.
 * @property {number} [presence_penalty] - Presence penalty.
 * @property {number} [frequency_penalty] - Frequency penalty.
 * @property {Array<import('./smart-chat-model.js').ChatModelToolDefinition>} [tools] - Tool definitions available to the model.
 * @property {'auto'|'none'|'required'|Object.<string, unknown>} [tool_choice] - Tool-choice strategy or provider-specific override.
 */
export const ChatModelRequest = {};

/**
 * @typedef {Object} ChatModelResponseMessage
 * @property {'assistant'|'function'|'tool'} role - Normalized response role.
 * @property {string|Array<import('./smart-chat-model.js').ChatModelMessageContentPart>} content - Response content.
 * @property {string} [name] - Function name for function-role responses.
 * @property {string} [refusal] - Refusal text when provided separately from ordinary content.
 * @property {Array<import('./smart-chat-model.js').ChatModelToolCall>} [tool_calls] - Tool calls emitted by the model.
 */
export const ChatModelResponseMessage = {};

/**
 * @typedef {Object} ChatModelChoice
 * @property {number} index - Choice index.
 * @property {import('./smart-chat-model.js').ChatModelResponseMessage} message - Normalized response message.
 * @property {'stop'|'length'|'tool_calls'|'content_filter'|'function_call'|string|null} [finish_reason] - Provider finish reason.
 */
export const ChatModelChoice = {};

/**
 * @typedef {Object} ChatModelUsage
 * @property {number} [prompt_tokens] - Prompt token count.
 * @property {number} [completion_tokens] - Completion token count.
 * @property {number} [total_tokens] - Combined token count.
 * @property {Object.<string, number>} [prompt_tokens_details] - Provider input-token breakdown, including cached tokens.
 * @property {Object.<string, number>} [completion_tokens_details] - Provider output-token breakdown, including reasoning tokens.
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
 * @property {Object.<string, unknown>} [raw] - Raw provider response or accumulated streaming payload.
 * @property {Object.<string, unknown>} [error] - Normalized error payload when completion fails.
 */
export const ChatModelResponse = {};


/**
 * @typedef {new (adapter: unknown, req?: import('./smart-chat-model.js').ChatModelRequest) => object} ChatModelRequestAdapterClass
 * @description Constructor returned by SmartChatModelApiAdapter.req_adapter.
 */
export const ChatModelRequestAdapterClass = function () {};

/**
 * @typedef {new (adapter: unknown, res?: Object.<string, unknown>, status?: unknown) => object} ChatModelResponseAdapterClass
 * @description Constructor returned by SmartChatModelApiAdapter.res_adapter.
 */
export const ChatModelResponseAdapterClass = function () {};

/**
 * @typedef {Object} ChatModelStreamHandlers
 * @property {function(import('./smart-chat-model.js').ChatModelResponse): Promise<void>|void} [chunk] - Called for partial streaming updates.
 * @property {function(import('./smart-chat-model.js').ChatModelResponse): Promise<void>|void} [done] - Called when streaming completes.
 * @property {function(Object.<string, unknown>): Promise<void>|void} [error] - Called when streaming fails.
 */
export const ChatModelStreamHandlers = {};
