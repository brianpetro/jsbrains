/**
 * @typedef {Object} ModelMeta
 * @property {string} [name] - User-facing model configuration name.
 */
export const ModelMeta = {};

/**
 * @typedef {Object} ProviderModelConfig
 * @property {string} [id] - Provider model identifier.
 * @property {string} [model_name] - Provider model name used by adapters.
 * @property {string} [name] - Human-readable label.
 * @property {string} [description] - Human-readable description.
 * @property {number} [batch_size] - Preferred batch size for the model.
 * @property {number} [dims] - Embedding dimensions for embedding models.
 * @property {number} [max_tokens] - Maximum token limit exposed by the provider.
 * @property {number} [max_input_tokens] - Maximum input token limit for chat models.
 * @property {number} [max_output_tokens] - Maximum output token limit for chat models.
 * @property {boolean} [multimodal] - Whether the model accepts multimodal input.
 * @property {string} [adapter] - Provider adapter key.
 * @property {Object.<string, *>} [models_dev] - models.dev enrichment payload.
 * @property {Object.<string, *>} [cost] - Provider cost metadata when available.
 */
export const ProviderModelConfig = {};

/**
 * @typedef {Object.<string, ProviderModelConfig>} ProviderModelsMap
 * @description Provider model metadata keyed by provider model id.
 */
export const ProviderModelsMap = {};

/**
 * @typedef {Object} ModelData
 * @property {string} [key] - Stable model configuration key.
 * @property {number} [created_at] - Epoch milliseconds when the model config was created.
 * @property {string} [api_key] - Provider API key stored with the model config.
 * @property {string} [provider_key] - Provider adapter key.
 * @property {string} [model_key] - Selected provider model id.
 * @property {boolean} [test_passed] - Result of the most recent model test.
 * @property {import('./smart-models.js').ModelMeta} [meta] - User-managed metadata.
 * @property {import('./smart-models.js').ProviderModelsMap} [provider_models] - Cached provider model metadata.
 */
export const ModelData = {};

/**
 * @typedef {Object} ChatCompletionModelData
 * @property {string} [key] - Stable model configuration key.
 * @property {number} [created_at] - Epoch milliseconds when the model config was created.
 * @property {string} [api_key] - Provider API key stored with the model config.
 * @property {string} [provider_key] - Provider adapter key.
 * @property {string} [model_key] - Selected provider model id.
 * @property {boolean} [test_passed] - Result of the most recent model test.
 * @property {import('./smart-models.js').ModelMeta} [meta] - User-managed metadata.
 * @property {import('./smart-models.js').ProviderModelsMap} [provider_models] - Cached provider model metadata.
 */
export const ChatCompletionModelData = {};

/**
 * @typedef {Object} EmbeddingModelData
 * @property {string} [key] - Stable model configuration key.
 * @property {number} [created_at] - Epoch milliseconds when the model config was created.
 * @property {string} [api_key] - Provider API key stored with the model config.
 * @property {string} [provider_key] - Provider adapter key.
 * @property {string} [model_key] - Selected provider model id.
 * @property {boolean} [test_passed] - Result of the most recent model test.
 * @property {import('./smart-models.js').ModelMeta} [meta] - User-managed metadata.
 * @property {import('./smart-models.js').ProviderModelsMap} [provider_models] - Cached provider model metadata.
 * @property {number} [dims] - Embedding vector dimensions.
 * @property {number} [max_tokens] - Maximum input token count used by the embed adapter.
 */
export const EmbeddingModelData = {};

/**
 * @typedef {Object} RankingModelData
 * @property {string} [key] - Stable model configuration key.
 * @property {number} [created_at] - Epoch milliseconds when the model config was created.
 * @property {string} [api_key] - Provider API key stored with the model config.
 * @property {string} [provider_key] - Provider adapter key.
 * @property {string} [model_key] - Selected provider model id.
 * @property {boolean} [test_passed] - Result of the most recent model test.
 * @property {import('./smart-models.js').ModelMeta} [meta] - User-managed metadata.
 * @property {import('./smart-models.js').ProviderModelsMap} [provider_models] - Cached provider model metadata.
 */
export const RankingModelData = {};
