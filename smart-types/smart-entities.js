/**
 * @typedef {Object} EntityLastRead
 * @property {string|null} hash - Content hash for the most recent read.
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
 * @property {import('./smart-entities.js').EntityLastEmbed} [last_embed] - Metadata for the stored vector.
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
 * @property {import('./smart-entities.js').EntityLastRead} [last_read] - Most recent read metadata.
 * @property {import('./smart-entities.js').EntityEmbeddingsMap} [embeddings] - Per-model embedding data.
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
