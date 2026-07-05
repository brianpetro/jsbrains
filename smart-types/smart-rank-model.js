/**
 * @typedef {Object} RankingResult
 * @property {number} index - Index of the ranked document in the input array.
 * @property {number} score - Relevance score, higher is typically more relevant.
 * @property {string} [text] - Original document text when requested.
 * @property {*} [document] - Provider-specific original document payload.
 */
export const RankingResult = {};

/**
 * @typedef {Object} RankingOptions
 * @property {number} [top_k] - Limit the number of returned rankings.
 * @property {boolean} [return_documents] - Whether to include original document text/payloads.
 */
export const RankingOptions = {};

/**
 * @typedef {Object} RankInput
 * @property {string} query - Query text.
 * @property {string[]} documents - Documents to rank.
 * @property {RankingOptions} [options] - Ranking options.
 */
export const RankInput = {};

/**
 * @typedef {Object} RankingModelInfo
 * @property {string} id - Provider model identifier.
 * @property {string} [model_name] - Provider model name used by the adapter.
 * @property {string} [name] - Human-readable model name.
 * @property {string} [description] - Human-readable model description.
 * @property {string} [adapter] - Ranking adapter key.
 * @property {number} [max_tokens] - Maximum token limit exposed by the provider.
 */
export const RankingModelInfo = {};

/**
 * @typedef {Object.<string, RankingModelInfo>} RankingModelsMap
 * @description Available ranking models keyed by provider model id.
 */
export const RankingModelsMap = {};

/**
 * @typedef {Object} SmartRankModelData
 * @property {string} [adapter] - Adapter/provider key.
 * @property {string} [model_key] - Selected ranking model key.
 * @property {string} [api_key] - Provider API key.
 * @property {string} [endpoint] - Provider endpoint override.
 * @property {RankingModelsMap} [provider_models] - Cached provider model metadata.
 */
export const SmartRankModelData = {};

/**
 * @typedef {Object} SmartRankModelRequest
 * @property {string} query - Query text.
 * @property {string[]} documents - Documents to rank.
 */
export const SmartRankModelRequest = {};

/**
 * @typedef {Object} SmartRankModelApiResponse
 * @property {RankingResult[]} [results] - Ranking results returned by providers that use a results wrapper.
 * @property {Object.<string, *>} [meta] - Provider-specific metadata.
 * @property {Object.<string, *>} [error] - Provider error payload.
 */
export const SmartRankModelApiResponse = {};
