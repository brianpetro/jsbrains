export type ModelMeta = {
    /**
     * - User-facing model configuration name.
     */
    name?: string;
};
/**
 * @typedef {Object} ModelMeta
 * @property {string} [name] - User-facing model configuration name.
 */
export const ModelMeta: {};
export type ProviderModelConfig = {
    /**
     * - Provider model identifier.
     */
    id?: string;
    /**
     * - Provider model name used by adapters.
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
     * - Embedding dimensions for embedding models.
     */
    dims?: number;
    /**
     * - Maximum token limit exposed by the provider.
     */
    max_tokens?: number;
    /**
     * - Maximum input token limit for chat models.
     */
    max_input_tokens?: number;
    /**
     * - Maximum output token limit for chat models.
     */
    max_output_tokens?: number;
    /**
     * - Whether the model accepts multimodal input.
     */
    multimodal?: boolean;
    /**
     * - Provider adapter key.
     */
    adapter?: string;
    /**
     * - models.dev enrichment payload.
     */
    models_dev?: {
        [x: string]: unknown;
    };
    /**
     * - Provider cost metadata when available.
     */
    cost?: {
        [x: string]: unknown;
    };
};
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
 * @property {Object.<string, unknown>} [models_dev] - models.dev enrichment payload.
 * @property {Object.<string, unknown>} [cost] - Provider cost metadata when available.
 */
export const ProviderModelConfig: {};
export type ProviderModelsMap = {
    [x: string]: ProviderModelConfig;
};
/**
 * @typedef {Object.<string, ProviderModelConfig>} ProviderModelsMap
 * @description Provider model metadata keyed by provider model id.
 */
export const ProviderModelsMap: {};
export type ModelData = {
    /**
     * - Stable model configuration key.
     */
    key?: string;
    /**
     * - Epoch milliseconds when the model config was created.
     */
    created_at?: number;
    /**
     * - Provider API key stored with the model config.
     */
    api_key?: string;
    /**
     * - Provider adapter key.
     */
    provider_key?: string;
    /**
     * - Selected provider model id.
     */
    model_key?: string;
    /**
     * - Result of the most recent model test.
     */
    test_passed?: boolean;
    /**
     * - User-managed metadata.
     */
    meta?: import("./smart-models.js").ModelMeta;
    /**
     * - Cached provider model metadata.
     */
    provider_models?: import("./smart-models.js").ProviderModelsMap;
};
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
export const ModelData: {};
export type ChatCompletionModelData = {
    /**
     * - Stable model configuration key.
     */
    key?: string;
    /**
     * - Epoch milliseconds when the model config was created.
     */
    created_at?: number;
    /**
     * - Provider API key stored with the model config.
     */
    api_key?: string;
    /**
     * - Provider adapter key.
     */
    provider_key?: string;
    /**
     * - Selected provider model id.
     */
    model_key?: string;
    /**
     * - Result of the most recent model test.
     */
    test_passed?: boolean;
    /**
     * - User-managed metadata.
     */
    meta?: import("./smart-models.js").ModelMeta;
    /**
     * - Cached provider model metadata.
     */
    provider_models?: import("./smart-models.js").ProviderModelsMap;
};
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
export const ChatCompletionModelData: {};
export type EmbeddingModelData = {
    /**
     * - Stable model configuration key.
     */
    key?: string;
    /**
     * - Epoch milliseconds when the model config was created.
     */
    created_at?: number;
    /**
     * - Provider API key stored with the model config.
     */
    api_key?: string;
    /**
     * - Provider adapter key.
     */
    provider_key?: string;
    /**
     * - Selected provider model id.
     */
    model_key?: string;
    /**
     * - Result of the most recent model test.
     */
    test_passed?: boolean;
    /**
     * - User-managed metadata.
     */
    meta?: import("./smart-models.js").ModelMeta;
    /**
     * - Cached provider model metadata.
     */
    provider_models?: import("./smart-models.js").ProviderModelsMap;
    /**
     * - Embedding vector dimensions.
     */
    dims?: number;
    /**
     * - Maximum input token count used by the embed adapter.
     */
    max_tokens?: number;
};
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
export const EmbeddingModelData: {};
export type RankingModelData = {
    /**
     * - Stable model configuration key.
     */
    key?: string;
    /**
     * - Epoch milliseconds when the model config was created.
     */
    created_at?: number;
    /**
     * - Provider API key stored with the model config.
     */
    api_key?: string;
    /**
     * - Provider adapter key.
     */
    provider_key?: string;
    /**
     * - Selected provider model id.
     */
    model_key?: string;
    /**
     * - Result of the most recent model test.
     */
    test_passed?: boolean;
    /**
     * - User-managed metadata.
     */
    meta?: import("./smart-models.js").ModelMeta;
    /**
     * - Cached provider model metadata.
     */
    provider_models?: import("./smart-models.js").ProviderModelsMap;
};
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
export const RankingModelData: {};
