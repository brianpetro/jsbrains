/**
 * @typedef {Object} EntityLastRead
 * @property {string|null} [hash] - Content hash for the most recent read.
 * @property {number} [at] - Epoch milliseconds when the read occurred.
 */
export const EntityLastRead = {};

/**
 * @typedef {Object} EntityLastEmbed
 * @property {string|null} [hash] - Hash of the content that produced the stored embedding.
 * @property {number} [tokens] - Token count reported by the embed model.
 */
export const EntityLastEmbed = {};

/**
 * @typedef {Object} EntityEmbeddingRecord
 * @property {Array<number>} [vec] - Stored embedding vector for a model.
 * @property {EntityLastEmbed} [last_embed] - Metadata for the stored vector.
 * @property {string} [error] - Last embedding error for the model.
 */
export const EntityEmbeddingRecord = {};

/**
 * @typedef {Object.<string, EntityEmbeddingRecord>} EntityEmbeddingsMap
 * @description Embeddings keyed by embed model key.
 */
export const EntityEmbeddingsMap = {};

/**
 * @typedef {Object} SmartEntityData
 * @property {string} [key] - Stable item key.
 * @property {string|null} [path] - Source path or equivalent primary reference.
 * @property {EntityLastRead} [last_read] - Most recent read metadata.
 * @property {EntityLastEmbed} [last_embed] - Deprecated top-level last embed metadata retained for compatibility.
 * @property {EntityEmbeddingsMap|null} [embeddings] - Per-model embedding data.
 * @property {Object.<string, number>} [clusters] - Cluster membership states keyed by cluster key.
 */
export const SmartEntityData = {};

/**
 * @typedef {Object} EntityLookupResult
 * @property {string} key - Item key for the lookup hit.
 * @property {number} score - Similarity or relevance score.
 * @property {*} item - Item instance associated with the result.
 * @property {number} [hypothetical_i] - Hypothetical input index used during lookup aggregation.
 */
export const EntityLookupResult = {};

/**
 * @typedef {Object} EntityConnectionResult
 * @property {*} item - Entity item associated with the result.
 * @property {number} score - Similarity or relevance score.
 */
export const EntityConnectionResult = {};

/**
 * @typedef {Object} EmbedInput
 * @property {string} embed_input - Text sent to the embedding model.
 */
export const EmbedInput = {};

/**
 * @typedef {Object} EmbedBatchResult
 * @property {Array<number>} vec - Generated embedding vector.
 * @property {number} [tokens] - Optional token count returned by the embedding model.
 */
export const EmbedBatchResult = {};

/**
 * @typedef {Object} EmbedModel
 * @property {string} model_key - Active embedding model key.
 * @property {string} [model_name] - Display name for the active model.
 * @property {number} [batch_size] - Batch size used for embedding.
 * @property {boolean} [is_loaded] - Whether the model is loaded.
 * @property {function(): Promise<void>|void} [load] - Loads the model.
 * @property {function(): Promise<void>|void} [unload] - Unloads the model.
 * @property {function(Array<EmbedInput|*>): Promise<Array<EmbedBatchResult>>} embed_batch - Embeds a batch of inputs.
 */
export const EmbedModel = {};

/**
 * @typedef {Object} EmbedModelEntry
 * @property {EmbedModel} instance - Active embedding model instance.
 */
export const EmbedModelEntry = {};

/**
 * @typedef {Object.<string, EmbedModelEntry>} EmbedModelRegistry
 * @property {EmbedModelEntry} [default] - Default embedding model entry.
 */
export const EmbedModelRegistry = {};

/**
 * @typedef {import('./smart-collections.js').CollectionEnv & Object.<string, *> & {
 *   embedding_models: EmbedModelRegistry,
 *   chats?: Object.<string, *>,
 *   smart_connections_plugin?: Object.<string, *>,
 *   main?: Object.<string, *>,
 *   notices?: Object.<string, *>
 * }} SmartEntitiesEnv
 */
export const SmartEntitiesEnv = {};

/**
 * @typedef {import('./smart-collections.js').CollectionOptions & Object.<string, *>} SmartEntitiesOptions
 */
export const SmartEntitiesOptions = {};

/**
 * @typedef {import('./smart-collections.js').CollectionFilterOptions & Object.<string, *>} SmartEntitiesFilter
 */
export const SmartEntitiesFilter = {};

/**
 * @typedef {Object} EntityLookupParams
 * @property {Array<string>} [hypotheticals] - Hypothetical text used to create query vectors.
 * @property {SmartEntitiesFilter} [filter] - Filter options passed to nearest lookup.
 * @property {number} [k] - Deprecated lookup limit retained for compatibility.
 */
export const EntityLookupParams = {};

/**
 * @typedef {Object} FindConnectionsParams
 * @property {SmartEntitiesFilter} [filter] - Nested filter options.
 * @property {number} [limit] - Result limit.
 */
export const FindConnectionsParams = {};

/**
 * @typedef {Object} FrontmatterFilterEntry
 * @property {string} key - Normalized frontmatter key.
 * @property {string|null} value - Optional normalized frontmatter value.
 */
export const FrontmatterFilterEntry = {};

/**
 * @typedef {Object} FrontmatterFilter
 * @property {Array<FrontmatterFilterEntry>} [include] - Include entries.
 * @property {Array<FrontmatterFilterEntry>} [exclude] - Exclude entries.
 */
export const FrontmatterFilter = {};

/**
 * @typedef {Object} EntitiesVectorProgressState
 * @property {boolean} active - Whether queue processing is active.
 * @property {boolean} [paused] - Whether queue processing is paused.
 * @property {number} progress - Completed item count.
 * @property {number} total - Total item count in the current queue.
 * @property {number} [tokens_per_second] - Aggregate throughput for the current run.
 * @property {string} [model_name] - Embed model label for the current run.
 * @property {string} [reason] - Pause reason when applicable.
 * @property {number} [updated_at] - Epoch milliseconds for the last state update.
 */
export const EntitiesVectorProgressState = {};
