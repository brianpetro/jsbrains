/**
 * @typedef {Object} EmbedInputItem
 * @property {string} embed_input - Raw text sent to the embed model.
 * @property {Array<number>} [vec] - Embedding vector attached after processing.
 * @property {number} [tokens] - Token count reported or estimated for the input.
 * @property {string} [error] - Error message captured for the input.
 */
export const EmbedInputItem = {};

/**
 * @typedef {Object} EmbeddingResult
 * @property {Array<number>} vec - Generated embedding vector.
 * @property {number|null} [tokens] - Token count when the adapter provides one.
 * @property {Object.<string, *>} [error] - Normalized error payload for the result.
 */
export const EmbeddingResult = {};

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
export const EmbeddingModelInfo = {};

/**
 * @typedef {Object.<string, EmbeddingModelInfo>} EmbeddingModelsMap
 * @description Available embed models keyed by provider model id.
 */
export const EmbeddingModelsMap = {};
