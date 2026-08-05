export type ChatModelMessageTextPart = {
    /**
     * - Text content discriminator.
     */
    type: "text";
    /**
     * - Text payload.
     */
    text: string;
};
/**
 * @typedef {Object} ChatModelMessageTextPart
 * @property {'text'} type - Text content discriminator.
 * @property {string} text - Text payload.
 */
export const ChatModelMessageTextPart: {};
export type ChatModelMessageImagePart = {
    /**
     * - Image content discriminator.
     */
    type: "image_url";
    /**
     * - Image URL payload.
     */
    image_url: {
        url: string;
    };
};
/**
 * @typedef {Object} ChatModelMessageImagePart
 * @property {'image_url'} type - Image content discriminator.
 * @property {{url: string}} image_url - Image URL payload.
 */
export const ChatModelMessageImagePart: {};
export type ChatModelMessageFilePart = {
    /**
     * - File content discriminator.
     */
    type: "file";
    /**
     * - File payload for providers that accept inline files.
     */
    file: {
        filename: string;
        file_data: string;
    };
};
/**
 * @typedef {Object} ChatModelMessageFilePart
 * @property {'file'} type - File content discriminator.
 * @property {{filename: string, file_data: string}} file - File payload for providers that accept inline files.
 */
export const ChatModelMessageFilePart: {};
export type ChatModelMessageContentPart = (ChatModelMessageTextPart | ChatModelMessageImagePart | ChatModelMessageFilePart);
/**
 * @typedef {(ChatModelMessageTextPart|ChatModelMessageImagePart|ChatModelMessageFilePart)} ChatModelMessageContentPart
 * @description Supported structured content parts used in normalized chat requests.
 */
export const ChatModelMessageContentPart: {};
export type ChatModelToolDefinition = {
    /**
     * - Tool type discriminator.
     */
    type: "function";
    /**
     * - Tool function metadata.
     */
    function: {
        name: string;
        description?: string;
        parameters?: {
            [x: string]: any;
        };
    };
};
/**
 * @typedef {Object} ChatModelToolDefinition
 * @property {'function'} type - Tool type discriminator.
 * @property {Object} function - Tool function metadata.
 * @property {string} function.name - Tool name.
 * @property {string} [function.description] - Tool description.
 * @property {Object.<string, *>} [function.parameters] - JSON schema-like parameter object.
 */
export const ChatModelToolDefinition: {};
export type ChatModelToolCall = {
    /**
     * - Tool call id when provided by the model.
     */
    id?: string;
    /**
     * - Tool type discriminator.
     */
    type: "function";
    /**
     * - Tool function call payload.
     */
    function: {
        name: string;
        arguments: string;
    };
};
/**
 * @typedef {Object} ChatModelToolCall
 * @property {string} [id] - Tool call id when provided by the model.
 * @property {'function'} type - Tool type discriminator.
 * @property {Object} function - Tool function call payload.
 * @property {string} function.name - Tool name.
 * @property {string} function.arguments - Serialized tool arguments.
 */
export const ChatModelToolCall: {};
export type ChatModelRequestMessage = {
    /**
     * - Message role.
     */
    role: "system" | "user" | "assistant" | "tool" | "function";
    /**
     * - Message content.
     */
    content: string | Array<import("./smart-chat-model.js").ChatModelMessageContentPart>;
    /**
     * - Function or tool name for function-role payloads.
     */
    name?: string;
    /**
     * - Tool calls attached to an assistant message.
     */
    tool_calls?: Array<import("./smart-chat-model.js").ChatModelToolCall>;
    /**
     * - Tool call id used by tool-role follow-up messages.
     */
    tool_call_id?: string;
    /**
     * - Deprecated shorthand image URL field retained for compatibility.
     */
    image_url?: string;
};
/**
 * @typedef {Object} ChatModelRequestMessage
 * @property {'system'|'user'|'assistant'|'tool'|'function'} role - Message role.
 * @property {string|Array<import('./smart-chat-model.js').ChatModelMessageContentPart>} content - Message content.
 * @property {string} [name] - Function or tool name for function-role payloads.
 * @property {Array<import('./smart-chat-model.js').ChatModelToolCall>} [tool_calls] - Tool calls attached to an assistant message.
 * @property {string} [tool_call_id] - Tool call id used by tool-role follow-up messages.
 * @property {string} [image_url] - Deprecated shorthand image URL field retained for compatibility.
 */
export const ChatModelRequestMessage: {};
export type ChatModelRequest = {
    /**
     * - Normalized chat history.
     */
    messages: Array<import("./smart-chat-model.js").ChatModelRequestMessage>;
    /**
     * - Provider model override.
     */
    model?: string;
    /**
     * - Sampling temperature.
     */
    temperature?: number;
    /**
     * - Maximum completion token count.
     */
    max_tokens?: number;
    /**
     * - Whether the request should stream partial responses.
     */
    stream?: boolean;
    /**
     * - Top-p sampling parameter.
     */
    top_p?: number;
    /**
     * - Presence penalty.
     */
    presence_penalty?: number;
    /**
     * - Frequency penalty.
     */
    frequency_penalty?: number;
    /**
     * - Tool definitions available to the model.
     */
    tools?: Array<import("./smart-chat-model.js").ChatModelToolDefinition>;
    /**
     * - Tool-choice strategy or provider-specific override.
     */
    tool_choice?: "auto" | "none" | {
        [x: string]: any;
    };
};
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
export const ChatModelRequest: {};
export type ChatModelResponseMessage = {
    /**
     * - Normalized response role.
     */
    role: "assistant" | "function" | "tool";
    /**
     * - Response content.
     */
    content: string | Array<import("./smart-chat-model.js").ChatModelMessageContentPart>;
    /**
     * - Function name for function-role responses.
     */
    name?: string;
    /**
     * - Tool calls emitted by the model.
     */
    tool_calls?: Array<import("./smart-chat-model.js").ChatModelToolCall>;
};
/**
 * @typedef {Object} ChatModelResponseMessage
 * @property {'assistant'|'function'|'tool'} role - Normalized response role.
 * @property {string|Array<import('./smart-chat-model.js').ChatModelMessageContentPart>} content - Response content.
 * @property {string} [name] - Function name for function-role responses.
 * @property {Array<import('./smart-chat-model.js').ChatModelToolCall>} [tool_calls] - Tool calls emitted by the model.
 */
export const ChatModelResponseMessage: {};
export type ChatModelChoice = {
    /**
     * - Choice index.
     */
    index: number;
    /**
     * - Normalized response message.
     */
    message: import("./smart-chat-model.js").ChatModelResponseMessage;
    /**
     * - Provider finish reason.
     */
    finish_reason?: "stop" | "length" | "tool_calls" | "content_filter" | "function_call" | string;
};
/**
 * @typedef {Object} ChatModelChoice
 * @property {number} index - Choice index.
 * @property {import('./smart-chat-model.js').ChatModelResponseMessage} message - Normalized response message.
 * @property {'stop'|'length'|'tool_calls'|'content_filter'|'function_call'|string} [finish_reason] - Provider finish reason.
 */
export const ChatModelChoice: {};
export type ChatModelUsage = {
    /**
     * - Prompt token count.
     */
    prompt_tokens?: number;
    /**
     * - Completion token count.
     */
    completion_tokens?: number;
    /**
     * - Combined token count.
     */
    total_tokens?: number;
};
/**
 * @typedef {Object} ChatModelUsage
 * @property {number} [prompt_tokens] - Prompt token count.
 * @property {number} [completion_tokens] - Completion token count.
 * @property {number} [total_tokens] - Combined token count.
 */
export const ChatModelUsage: {};
export type ChatModelResponse = {
    /**
     * - Provider response id.
     */
    id?: string;
    /**
     * - Provider response object type.
     */
    object?: string;
    /**
     * - Epoch seconds or milliseconds from the provider response.
     */
    created?: number;
    /**
     * - Provider model identifier.
     */
    model?: string;
    /**
     * - Normalized completion choices.
     */
    choices: Array<import("./smart-chat-model.js").ChatModelChoice>;
    /**
     * - Provider usage data.
     */
    usage?: import("./smart-chat-model.js").ChatModelUsage;
    /**
     * - Raw provider response or accumulated streaming payload.
     */
    raw?: {
        [x: string]: any;
    };
    /**
     * - Normalized error payload when completion fails.
     */
    error?: {
        [x: string]: any;
    };
};
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
export const ChatModelResponse: {};
export type ChatModelRequestAdapterClass = new (adapter: any, req?: import("./smart-chat-model.js").ChatModelRequest) => any;
export function ChatModelRequestAdapterClass(): void;
export type ChatModelResponseAdapterClass = new (adapter: any, res?: {
    [x: string]: any;
}, status?: any) => any;
export function ChatModelResponseAdapterClass(): void;
export type ChatModelStreamHandlers = {
    /**
     * - Called for partial streaming updates.
     */
    chunk?: (arg0: import("./smart-chat-model.js").ChatModelResponse) => Promise<void> | void;
    /**
     * - Called when streaming completes.
     */
    done?: (arg0: import("./smart-chat-model.js").ChatModelResponse) => Promise<void> | void;
    /**
     * - Called when streaming fails.
     */
    error?: (arg0: {
        [x: string]: any;
    }) => Promise<void> | void;
};
/**
 * @typedef {Object} ChatModelStreamHandlers
 * @property {function(import('./smart-chat-model.js').ChatModelResponse): Promise<void>|void} [chunk] - Called for partial streaming updates.
 * @property {function(import('./smart-chat-model.js').ChatModelResponse): Promise<void>|void} [done] - Called when streaming completes.
 * @property {function(Object.<string, *>): Promise<void>|void} [error] - Called when streaming fails.
 */
export const ChatModelStreamHandlers: {};
