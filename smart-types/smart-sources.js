/**
 * @typedef {Object} SourceLastRead
 * @property {string|null} hash - Content hash for the most recent source read.
 * @property {number} [at] - Epoch milliseconds when the source was read.
 * @property {number} [mtime] - Source modification time when captured.
 */
export const SourceLastRead = {};

/**
 * @typedef {Object} SourceLastImport
 * @property {number} [at] - Epoch milliseconds when import completed.
 * @property {string|null} [hash] - Content hash imported into cached state.
 * @property {number} [mtime] - Source modification time at import.
 * @property {number} [size] - Source size at import.
 */
export const SourceLastImport = {};

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
export const LinkObject = {};

/**
 * @typedef {Object} SourceTaskCollections
 * @property {{all: Array<number>, top: Array<number>}} [incomplete] - Parsed task line collections.
 */
export const SourceTaskCollections = {};

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
export const SmartSourceData = {};

/**
 * @typedef {Object} SourceReImportQueueEntry
 * @property {*} source - SmartSource instance queued for re-import.
 * @property {Object.<string, *>} [event_meta] - Event metadata associated with the queue entry.
 */
export const SourceReImportQueueEntry = {};

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
export const SourceLifecycleEvent = {};
