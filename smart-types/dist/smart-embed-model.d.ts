export type EmbedInputItem = {
    /**
     * - Raw text sent to the embed model.
     */
    embed_input: string;
    /**
     * - Embedding vector attached after processing.
     */
    vec?: Array<number>;
    /**
     * - Token count reported or estimated for the input.
     */
    tokens?: number;
    /**
     * - Error message captured for the input.
     */
    error?: string;
};
/**
 * @typedef {Object} EmbedInputItem
 * @property {string} embed_input - Raw text sent to the embed model.
 * @property {Array<number>} [vec] - Embedding vector attached after processing.
 * @property {number} [tokens] - Token count reported or estimated for the input.
 * @property {string} [error] - Error message captured for the input.
 */
export const EmbedInputItem: {};
export type EmbeddingResult = {
    /**
     * - Generated embedding vector.
     */
    vec: Array<number>;
    /**
     * - Token count when the adapter provides one.
     */
    tokens?: number | null;
    /**
     * - Normalized error payload for the result.
     */
    error?: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {Object} EmbeddingResult
 * @property {Array<number>} vec - Generated embedding vector.
 * @property {number|null} [tokens] - Token count when the adapter provides one.
 * @property {Object.<string, unknown>} [error] - Normalized error payload for the result.
 */
export const EmbeddingResult: {};
export type EmbeddingModelInfo = {
    /**
     * - Provider model identifier.
     */
    id: string;
    /**
     * - Provider model name used by the adapter.
     */
    model_name?: string;
    /**
     * - Human-readable label.
     */
    name?: string;
    /**
     * - Human-readable description.
     */
    description?: string;
    /**
     * - Preferred batch size for the model.
     */
    batch_size?: number;
    /**
     * - Embedding vector dimensions.
     */
    dims?: number;
    /**
     * - Maximum token limit for a single input.
     */
    max_tokens?: number;
    /**
     * - Endpoint used by API adapters.
     */
    endpoint?: string;
    /**
     * - Embed adapter key.
     */
    adapter?: string;
    /**
     * - Whether the model accepts multimodal input.
     */
    multimodal?: boolean;
};
/**
 * @typedef {Object} EmbeddingModelInfo
 * @property {string} id - Provider model identifier.
 * @property {string} [model_name] - Provider model name used by the adapter.
 * @property {string} [name] - Human-readable label.
 * @property {string} [description] - Human-readable description.
 * @property {number} [batch_size] - Preferred batch size for the model.
 * @property {number} [dims] - Embedding vector dimensions.
 * @property {number} [max_tokens] - Maximum token limit for a single input.
 * @property {string} [endpoint] - Endpoint used by API adapters.
 * @property {string} [adapter] - Embed adapter key.
 * @property {boolean} [multimodal] - Whether the model accepts multimodal input.
 */
export const EmbeddingModelInfo: {};
export type EmbeddingModelsMap = {
    [x: string]: EmbeddingModelInfo;
};
/**
 * @typedef {Object.<string, EmbeddingModelInfo>} EmbeddingModelsMap
 * @description Available embed models keyed by provider model id.
 */
export const EmbeddingModelsMap: {};
export type EmbedModelRequestAdapterClass = new (adapter: unknown, embed_inputs: Array<string>) => object;
export function EmbedModelRequestAdapterClass(): void;
export type EmbedModelResponseAdapterClass = new (adapter: unknown, response: {
    [x: string]: unknown;
}) => object;
export function EmbedModelResponseAdapterClass(): void;
