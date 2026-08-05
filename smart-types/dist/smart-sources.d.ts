export type SourceLastRead = {
    /**
     * - Content hash for the most recent source read.
     */
    hash: string | null;
    /**
     * - Epoch milliseconds when the source was read.
     */
    at?: number;
    /**
     * - Source modification time when captured.
     */
    mtime?: number;
};
/**
 * @typedef {Object} SourceLastRead
 * @property {string|null} hash - Content hash for the most recent source read.
 * @property {number} [at] - Epoch milliseconds when the source was read.
 * @property {number} [mtime] - Source modification time when captured.
 */
export const SourceLastRead: {};
export type SourceLastImport = {
    /**
     * - Epoch milliseconds when import completed.
     */
    at?: number;
    /**
     * - Content hash imported into cached state.
     */
    hash?: string | null;
    /**
     * - Source modification time at import.
     */
    mtime?: number;
    /**
     * - Source size at import.
     */
    size?: number;
};
/**
 * @typedef {Object} SourceLastImport
 * @property {number} [at] - Epoch milliseconds when import completed.
 * @property {string|null} [hash] - Content hash imported into cached state.
 * @property {number} [mtime] - Source modification time at import.
 * @property {number} [size] - Source size at import.
 */
export const SourceLastImport: {};
export type LinkObject = {
    /**
     * - The resolved key of the linked item.
     */
    key: string;
    /**
     * - The key of the source item that contains this link.
     */
    source_key: string;
    /**
     * - Bases row number when link data comes from a Bases embed.
     */
    bases_row?: number;
    /**
     * - Whether the link is an embedded link.
     */
    embedded?: boolean;
    /**
     * - Source line number where the link appears.
     */
    line?: number;
    /**
     * - Original link target before path resolution.
     */
    target?: string;
    /**
     * - Anchor text for the link, if available.
     */
    title?: string;
};
/**
 * @typedef {Object} LinkObject
 * @property {string} key - The resolved key of the linked item.
 * @property {string} source_key - The key of the source item that contains this link.
 * @property {number} [bases_row] - Bases row number when link data comes from a Bases embed.
 * @property {boolean} [embedded] - Whether the link is an embedded link.
 * @property {number} [line] - Source line number where the link appears.
 * @property {string} [target] - Original link target before path resolution.
 * @property {string} [title] - Anchor text for the link, if available.
 */
export const LinkObject: {};
export type SourceTaskCollections = {
    /**
     * - Parsed task line collections.
     */
    incomplete?: {
        all: Array<number>;
        top: Array<number>;
    };
};
/**
 * @typedef {Object} SourceTaskCollections
 * @property {{all: Array<number>, top: Array<number>}} [incomplete] - Parsed task line collections.
 */
export const SourceTaskCollections: {};
export type SmartSourceData = {
    /**
     * - Stable source key.
     */
    key?: string;
    /**
     * - Source path on disk or equivalent location.
     */
    path?: string;
    /**
     * - Most recent source read metadata.
     */
    last_read?: import("./smart-sources.js").SourceLastRead;
    /**
     * - Most recent source import metadata.
     */
    last_import?: import("./smart-sources.js").SourceLastImport;
    /**
     * - Parsed block line ranges keyed by sub-key.
     */
    blocks?: {
        [x: string]: number[];
    };
    /**
     * - Raw outlink payloads collected during import.
     */
    outlinks?: Array<(import("./smart-sources.js").LinkObject | {
        [x: string]: any;
    })>;
    /**
     * - Parsed source metadata such as frontmatter.
     */
    metadata?: {
        [x: string]: any;
    };
    /**
     * - Line numbers containing markdown tasks.
     */
    task_lines?: Array<number>;
    /**
     * - Grouped task line metadata.
     */
    tasks?: import("./smart-sources.js").SourceTaskCollections;
    /**
     * - Inclusive line ranges for fenced code blocks.
     */
    codeblock_ranges?: Array<Array<number>>;
    /**
     * - Per-model embedding data.
     */
    embeddings?: import("./smart-entities.js").EntityEmbeddingsMap;
};
/**
 * @typedef {Object} SmartSourceData
 * @property {string} [key] - Stable source key.
 * @property {string} [path] - Source path on disk or equivalent location.
 * @property {import('./smart-sources.js').SourceLastRead} [last_read] - Most recent source read metadata.
 * @property {import('./smart-sources.js').SourceLastImport} [last_import] - Most recent source import metadata.
 * @property {Object.<string, Array<number>>} [blocks] - Parsed block line ranges keyed by sub-key.
 * @property {Array<(import('./smart-sources.js').LinkObject|Object.<string, *>)>} [outlinks] - Raw outlink payloads collected during import.
 * @property {Object.<string, *>} [metadata] - Parsed source metadata such as frontmatter.
 * @property {Array<number>} [task_lines] - Line numbers containing markdown tasks.
 * @property {import('./smart-sources.js').SourceTaskCollections} [tasks] - Grouped task line metadata.
 * @property {Array<Array<number>>} [codeblock_ranges] - Inclusive line ranges for fenced code blocks.
 * @property {import('./smart-entities.js').EntityEmbeddingsMap} [embeddings] - Per-model embedding data.
 */
export const SmartSourceData: {};
export type SourceReImportQueueEntry = {
    /**
     * - SmartSource instance queued for re-import.
     */
    source: any;
    /**
     * - Event metadata associated with the queue entry.
     */
    event_meta?: {
        [x: string]: any;
    };
};
/**
 * @typedef {Object} SourceReImportQueueEntry
 * @property {*} source - SmartSource instance queued for re-import.
 * @property {Object.<string, *>} [event_meta] - Event metadata associated with the queue entry.
 */
export const SourceReImportQueueEntry: {};
export type SourceLifecycleEvent = {
    /**
     * - Source collection key when scoped by a collection helper.
     */
    collection_key?: string;
    /**
     * - Source item key.
     */
    item_key?: string;
    /**
     * - Canonical source path.
     */
    path?: string;
    /**
     * - New path supplied by rename events.
     */
    new_path?: string;
    /**
     * - Previous path supplied by rename events.
     */
    old_path?: string;
    /**
     * - Alternate previous path property used by some adapters.
     */
    from?: string;
    /**
     * - Adapter or subsystem that emitted the event.
     */
    event_source?: string;
};
/**
 * @typedef {Object} SourceLifecycleEvent
 * @property {string} [collection_key] - Source collection key when scoped by a collection helper.
 * @property {string} [item_key] - Source item key.
 * @property {string} [path] - Canonical source path.
 * @property {string} [new_path] - New path supplied by rename events.
 * @property {string} [old_path] - Previous path supplied by rename events.
 * @property {string} [from] - Alternate previous path property used by some adapters.
 * @property {string} [event_source] - Adapter or subsystem that emitted the event.
 */
export const SourceLifecycleEvent: {};
