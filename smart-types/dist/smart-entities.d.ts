export type EntityLastRead = {
    /**
     * - Content hash for the most recent read.
     */
    hash?: string | null;
    /**
     * - Epoch milliseconds when the read occurred.
     */
    at?: number;
};
/**
 * @typedef {Object} EntityLastRead
 * @property {string|null} [hash] - Content hash for the most recent read.
 * @property {number} [at] - Epoch milliseconds when the read occurred.
 */
export const EntityLastRead: {};
export type EntityLastEmbed = {
    /**
     * - Hash of the content that produced the stored embedding.
     */
    hash?: string | null;
    /**
     * - Token count reported by the embed model.
     */
    tokens?: number;
};
/**
 * @typedef {Object} EntityLastEmbed
 * @property {string|null} [hash] - Hash of the content that produced the stored embedding.
 * @property {number} [tokens] - Token count reported by the embed model.
 */
export const EntityLastEmbed: {};
export type EntityEmbeddingRecord = {
    /**
     * - Stored embedding vector for a model.
     */
    vec?: Array<number>;
    /**
     * - Metadata for the stored vector.
     */
    last_embed?: EntityLastEmbed;
    /**
     * - Last embedding error for the model.
     */
    error?: string;
};
/**
 * @typedef {Object} EntityEmbeddingRecord
 * @property {Array<number>} [vec] - Stored embedding vector for a model.
 * @property {EntityLastEmbed} [last_embed] - Metadata for the stored vector.
 * @property {string} [error] - Last embedding error for the model.
 */
export const EntityEmbeddingRecord: {};
export type EntityEmbeddingsMap = {
    [x: string]: EntityEmbeddingRecord;
};
/**
 * @typedef {Object.<string, EntityEmbeddingRecord>} EntityEmbeddingsMap
 * @description Embeddings keyed by embed model key.
 */
export const EntityEmbeddingsMap: {};
export type SmartEntityData = {
    /**
     * - Stable item key.
     */
    key?: string;
    /**
     * - Source path or equivalent primary reference.
     */
    path?: string | null;
    /**
     * - Most recent read metadata.
     */
    last_read?: EntityLastRead;
    /**
     * - Deprecated top-level last embed metadata retained for compatibility.
     */
    last_embed?: EntityLastEmbed;
    /**
     * - Per-model embedding data.
     */
    embeddings?: EntityEmbeddingsMap | null;
    /**
     * - Cluster membership states keyed by cluster key.
     */
    clusters?: {
        [x: string]: number;
    };
};
/**
 * @typedef {Object} SmartEntityData
 * @property {string} [key] - Stable item key.
 * @property {string|null} [path] - Source path or equivalent primary reference.
 * @property {EntityLastRead} [last_read] - Most recent read metadata.
 * @property {EntityLastEmbed} [last_embed] - Deprecated top-level last embed metadata retained for compatibility.
 * @property {EntityEmbeddingsMap|null} [embeddings] - Per-model embedding data.
 * @property {Object.<string, number>} [clusters] - Cluster membership states keyed by cluster key.
 */
export const SmartEntityData: {};
export type EntityLookupResult = {
    /**
     * - Item key for the lookup hit.
     */
    key: string;
    /**
     * - Similarity or relevance score.
     */
    score: number;
    /**
     * - Item instance associated with the result.
     */
    item: unknown;
    /**
     * - Hypothetical input index used during lookup aggregation.
     */
    hypothetical_i?: number;
};
/**
 * @typedef {Object} EntityLookupResult
 * @property {string} key - Item key for the lookup hit.
 * @property {number} score - Similarity or relevance score.
 * @property {unknown} item - Item instance associated with the result.
 * @property {number} [hypothetical_i] - Hypothetical input index used during lookup aggregation.
 */
export const EntityLookupResult: {};
export type EntityConnectionResult = {
    /**
     * - Entity item associated with the result.
     */
    item: unknown;
    /**
     * - Similarity or relevance score.
     */
    score: number;
};
/**
 * @typedef {Object} EntityConnectionResult
 * @property {unknown} item - Entity item associated with the result.
 * @property {number} score - Similarity or relevance score.
 */
export const EntityConnectionResult: {};
export type EmbedInput = {
    /**
     * - Text sent to the embedding model.
     */
    embed_input: string;
};
/**
 * @typedef {Object} EmbedInput
 * @property {string} embed_input - Text sent to the embedding model.
 */
export const EmbedInput: {};
export type EmbedBatchResult = {
    /**
     * - Generated embedding vector.
     */
    vec: Array<number>;
    /**
     * - Optional token count returned by the embedding model.
     */
    tokens?: number;
};
/**
 * @typedef {Object} EmbedBatchResult
 * @property {Array<number>} vec - Generated embedding vector.
 * @property {number} [tokens] - Optional token count returned by the embedding model.
 */
export const EmbedBatchResult: {};
export type EmbedModel = {
    /**
     * - Active embedding model key.
     */
    model_key: string;
    /**
     * - Display name for the active model.
     */
    model_name?: string;
    /**
     * - Batch size used for embedding.
     */
    batch_size?: number;
    /**
     * - Whether the model is loaded.
     */
    is_loaded?: boolean;
    /**
     * - Loads the model.
     */
    load?: () => Promise<void> | void;
    /**
     * - Unloads the model.
     */
    unload?: () => Promise<void> | void;
    /**
     * - Embeds a batch of inputs.
     */
    embed_batch: (arg0: Array<EmbedInput | {
        [x: string]: unknown;
    }>) => Promise<Array<EmbedBatchResult>>;
};
/**
 * @typedef {Object} EmbedModel
 * @property {string} model_key - Active embedding model key.
 * @property {string} [model_name] - Display name for the active model.
 * @property {number} [batch_size] - Batch size used for embedding.
 * @property {boolean} [is_loaded] - Whether the model is loaded.
 * @property {function(): Promise<void>|void} [load] - Loads the model.
 * @property {function(): Promise<void>|void} [unload] - Unloads the model.
 * @property {function(Array<EmbedInput|Object.<string, unknown>>): Promise<Array<EmbedBatchResult>>} embed_batch - Embeds a batch of inputs.
 */
export const EmbedModel: {};
export type EmbedModelEntry = {
    /**
     * - Active embedding model instance.
     */
    instance: EmbedModel;
};
/**
 * @typedef {Object} EmbedModelEntry
 * @property {EmbedModel} instance - Active embedding model instance.
 */
export const EmbedModelEntry: {};
export type EmbedModelRegistry = {
    [x: string]: EmbedModelEntry;
};
/**
 * @typedef {Object.<string, EmbedModelEntry>} EmbedModelRegistry
 * @property {EmbedModelEntry} [default] - Default embedding model entry.
 */
export const EmbedModelRegistry: {};
export type SmartEntitiesEnv = import("./smart-collections.js").CollectionEnv & {
    [x: string]: unknown;
} & {
    embedding_models: EmbedModelRegistry;
    chats?: {
        [x: string]: unknown;
    };
    smart_connections_plugin?: {
        [x: string]: unknown;
    };
    main?: {
        [x: string]: unknown;
    };
    notices?: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {import('./smart-collections.js').CollectionEnv & Object.<string, unknown> & {
 *   embedding_models: EmbedModelRegistry,
 *   chats?: Object.<string, unknown>,
 *   smart_connections_plugin?: Object.<string, unknown>,
 *   main?: Object.<string, unknown>,
 *   notices?: Object.<string, unknown>
 * }} SmartEntitiesEnv
 */
export const SmartEntitiesEnv: {};
export type SmartEntitiesOptions = import("./smart-collections.js").CollectionOptions & {
    [x: string]: unknown;
};
/**
 * @typedef {import('./smart-collections.js').CollectionOptions & Object.<string, unknown>} SmartEntitiesOptions
 */
export const SmartEntitiesOptions: {};
export type SmartEntitiesFilter = import("./smart-collections.js").CollectionFilterOptions & {
    [x: string]: unknown;
};
/**
 * @typedef {import('./smart-collections.js').CollectionFilterOptions & Object.<string, unknown>} SmartEntitiesFilter
 */
export const SmartEntitiesFilter: {};
export type EntityLookupParams = {
    /**
     * - Hypothetical text used to create query vectors.
     */
    hypotheticals?: Array<string>;
    /**
     * - Filter options passed to nearest lookup.
     */
    filter?: SmartEntitiesFilter;
    /**
     * - Deprecated lookup limit retained for compatibility.
     */
    k?: number;
};
/**
 * @typedef {Object} EntityLookupParams
 * @property {Array<string>} [hypotheticals] - Hypothetical text used to create query vectors.
 * @property {SmartEntitiesFilter} [filter] - Filter options passed to nearest lookup.
 * @property {number} [k] - Deprecated lookup limit retained for compatibility.
 */
export const EntityLookupParams: {};
export type FindConnectionsParams = {
    /**
     * - Nested filter options.
     */
    filter?: SmartEntitiesFilter;
    /**
     * - Result limit.
     */
    limit?: number;
};
/**
 * @typedef {Object} FindConnectionsParams
 * @property {SmartEntitiesFilter} [filter] - Nested filter options.
 * @property {number} [limit] - Result limit.
 */
export const FindConnectionsParams: {};
export type FrontmatterFilterEntry = {
    /**
     * - Normalized frontmatter key.
     */
    key: string;
    /**
     * - Optional normalized frontmatter value.
     */
    value: string | null;
};
/**
 * @typedef {Object} FrontmatterFilterEntry
 * @property {string} key - Normalized frontmatter key.
 * @property {string|null} value - Optional normalized frontmatter value.
 */
export const FrontmatterFilterEntry: {};
export type FrontmatterFilter = {
    /**
     * - Include entries.
     */
    include?: Array<FrontmatterFilterEntry>;
    /**
     * - Exclude entries.
     */
    exclude?: Array<FrontmatterFilterEntry>;
};
/**
 * @typedef {Object} FrontmatterFilter
 * @property {Array<FrontmatterFilterEntry>} [include] - Include entries.
 * @property {Array<FrontmatterFilterEntry>} [exclude] - Exclude entries.
 */
export const FrontmatterFilter: {};
export type EntitiesVectorProgressState = {
    /**
     * - Whether queue processing is active.
     */
    active: boolean;
    /**
     * - Whether queue processing is paused.
     */
    paused?: boolean;
    /**
     * - Completed item count.
     */
    progress: number;
    /**
     * - Total item count in the current queue.
     */
    total: number;
    /**
     * - Aggregate throughput using model tokens or a four-characters-per-token estimate.
     */
    tokens_per_second?: number;
    /**
     * - Input characters successfully embedded in the current run.
     */
    characters_embedded?: number;
    /**
     * - Elapsed embedding processing time in milliseconds.
     */
    elapsed_ms?: number;
    /**
     * - Embed model label for the current run.
     */
    model_name?: string;
    /**
     * - Pause reason when applicable.
     */
    reason?: string;
    /**
     * - Epoch milliseconds for the last state update.
     */
    updated_at?: number;
};
/**
 * @typedef {Object} EntitiesVectorProgressState
 * @property {boolean} active - Whether queue processing is active.
 * @property {boolean} [paused] - Whether queue processing is paused.
 * @property {number} progress - Completed item count.
 * @property {number} total - Total item count in the current queue.
 * @property {number} [tokens_per_second] - Aggregate throughput using model tokens or a four-characters-per-token estimate.
 * @property {number} [characters_embedded] - Input characters successfully embedded in the current run.
 * @property {number} [elapsed_ms] - Elapsed embedding processing time in milliseconds.
 * @property {string} [model_name] - Embed model label for the current run.
 * @property {string} [reason] - Pause reason when applicable.
 * @property {number} [updated_at] - Epoch milliseconds for the last state update.
 */
export const EntitiesVectorProgressState: {};
