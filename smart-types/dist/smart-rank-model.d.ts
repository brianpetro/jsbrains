export type RankingResult = {
    /**
     * - Index of the ranked document in the input array.
     */
    index: number;
    /**
     * - Relevance score, higher is typically more relevant.
     */
    score: number;
    /**
     * - Original document text when requested.
     */
    text?: string;
    /**
     * - Provider-specific original document payload.
     */
    document?: unknown;
};
/**
 * @typedef {Object} RankingResult
 * @property {number} index - Index of the ranked document in the input array.
 * @property {number} score - Relevance score, higher is typically more relevant.
 * @property {string} [text] - Original document text when requested.
 * @property {unknown} [document] - Provider-specific original document payload.
 */
export const RankingResult: {};
export type RankingOptions = {
    /**
     * - Limit the number of returned rankings.
     */
    top_k?: number;
    /**
     * - Whether to include original document text/payloads.
     */
    return_documents?: boolean;
};
/**
 * @typedef {Object} RankingOptions
 * @property {number} [top_k] - Limit the number of returned rankings.
 * @property {boolean} [return_documents] - Whether to include original document text/payloads.
 */
export const RankingOptions: {};
export type RankInput = {
    /**
     * - Query text.
     */
    query: string;
    /**
     * - Documents to rank.
     */
    documents: string[];
    /**
     * - Ranking options.
     */
    options?: RankingOptions;
};
/**
 * @typedef {Object} RankInput
 * @property {string} query - Query text.
 * @property {string[]} documents - Documents to rank.
 * @property {RankingOptions} [options] - Ranking options.
 */
export const RankInput: {};
export type RankingModelInfo = {
    /**
     * - Provider model identifier.
     */
    id: string;
    /**
     * - Provider model name used by the adapter.
     */
    model_name?: string;
    /**
     * - Human-readable model name.
     */
    name?: string;
    /**
     * - Human-readable model description.
     */
    description?: string;
    /**
     * - Ranking adapter key.
     */
    adapter?: string;
    /**
     * - Maximum token limit exposed by the provider.
     */
    max_tokens?: number;
};
/**
 * @typedef {Object} RankingModelInfo
 * @property {string} id - Provider model identifier.
 * @property {string} [model_name] - Provider model name used by the adapter.
 * @property {string} [name] - Human-readable model name.
 * @property {string} [description] - Human-readable model description.
 * @property {string} [adapter] - Ranking adapter key.
 * @property {number} [max_tokens] - Maximum token limit exposed by the provider.
 */
export const RankingModelInfo: {};
export type RankingModelsMap = {
    [x: string]: RankingModelInfo;
};
/**
 * @typedef {Object.<string, RankingModelInfo>} RankingModelsMap
 * @description Available ranking models keyed by provider model id.
 */
export const RankingModelsMap: {};
export type SmartRankModelData = {
    /**
     * - Adapter/provider key.
     */
    adapter?: string;
    /**
     * - Selected ranking model key.
     */
    model_key?: string;
    /**
     * - Provider API key.
     */
    api_key?: string;
    /**
     * - Provider endpoint override.
     */
    endpoint?: string;
    /**
     * - Cached provider model metadata.
     */
    provider_models?: RankingModelsMap;
};
/**
 * @typedef {Object} SmartRankModelData
 * @property {string} [adapter] - Adapter/provider key.
 * @property {string} [model_key] - Selected ranking model key.
 * @property {string} [api_key] - Provider API key.
 * @property {string} [endpoint] - Provider endpoint override.
 * @property {RankingModelsMap} [provider_models] - Cached provider model metadata.
 */
export const SmartRankModelData: {};
export type SmartRankModelRequest = {
    /**
     * - Query text.
     */
    query: string;
    /**
     * - Documents to rank.
     */
    documents: string[];
};
/**
 * @typedef {Object} SmartRankModelRequest
 * @property {string} query - Query text.
 * @property {string[]} documents - Documents to rank.
 */
export const SmartRankModelRequest: {};
export type SmartRankModelApiResponse = {
    /**
     * - Ranking results returned by providers that use a results wrapper.
     */
    results?: RankingResult[];
    /**
     * - Provider-specific metadata.
     */
    meta?: {
        [x: string]: unknown;
    };
    /**
     * - Provider error payload.
     */
    error?: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {Object} SmartRankModelApiResponse
 * @property {RankingResult[]} [results] - Ranking results returned by providers that use a results wrapper.
 * @property {Object.<string, unknown>} [meta] - Provider-specific metadata.
 * @property {Object.<string, unknown>} [error] - Provider error payload.
 */
export const SmartRankModelApiResponse: {};
