/**
 * @typedef {number[]} NumericVector
 * @description Dense numeric vector used for similarity and geometry helpers.
 */
export const NumericVector = [];

/**
 * @typedef {Object} ScoredResult
 * @property {*} item - Item associated with the score.
 * @property {number} score - Sortable score.
 */
export const ScoredResult = {};

/**
 * @typedef {Object} ResultsAccumulator
 * @property {number} [min] - Current minimum score retained by top-result accumulation.
 * @property {number} [max] - Current maximum score retained by furthest-result accumulation.
 * @property {Set<ScoredResult>} results - Retained result set.
 */
export const ResultsAccumulator = {};

/**
 * @typedef {Object} FileTreeNode
 * @property {string} name - File or folder name.
 * @property {string} [path] - Full path for the node.
 * @property {'file'|'folder'} [type] - Node type.
 * @property {Object.<string, FileTreeNode>} [children] - Child nodes keyed by name.
 */
export const FileTreeNode = {};

/**
 * @typedef {Object} NormalizedError
 * @property {string} [message] - Human-readable error message.
 * @property {string|number} [code] - Provider or system error code.
 * @property {number|null} [status] - HTTP status when available.
 * @property {*} [details] - Provider-specific details.
 * @property {*} [raw] - Raw error payload.
 */
export const NormalizedError = {};

/**
 * @typedef {Object} XmlFragmentNode
 * @property {Object.<string, string>} [attributes] - XML attributes keyed by attribute name.
 * @property {string|Object.<string, XmlFragmentNode|XmlFragmentNode[]>|null} [contents] - Parsed child contents.
 */
export const XmlFragmentNode = {};

/**
 * @typedef {Object.<string, XmlFragmentNode>} XmlFragments
 * @description Parsed XML fragments keyed by root tag.
 */
export const XmlFragments = {};

/**
 * @typedef {Object} InsertTextInChunksOptions
 * @property {number} [chunk_size] - Number of characters to insert per chunk.
 * @property {number} [delay_ms] - Delay between chunks in milliseconds.
 */
export const InsertTextInChunksOptions = {};
