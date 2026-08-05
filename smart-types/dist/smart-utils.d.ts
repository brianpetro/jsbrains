export type NumericVector = number[];
/**
 * @typedef {number[]} NumericVector
 * @description Dense numeric vector used for similarity and geometry helpers.
 */
export const NumericVector: any[];
export type ScoredResult = {
    /**
     * - Item associated with the score.
     */
    item: any;
    /**
     * - Sortable score.
     */
    score: number;
};
/**
 * @typedef {Object} ScoredResult
 * @property {*} item - Item associated with the score.
 * @property {number} score - Sortable score.
 */
export const ScoredResult: {};
export type ResultsAccumulator = {
    /**
     * - Current minimum score retained by top-result accumulation.
     */
    min?: number;
    /**
     * - Current maximum score retained by furthest-result accumulation.
     */
    max?: number;
    /**
     * - Retained result set.
     */
    results: Set<ScoredResult>;
};
/**
 * @typedef {Object} ResultsAccumulator
 * @property {number} [min] - Current minimum score retained by top-result accumulation.
 * @property {number} [max] - Current maximum score retained by furthest-result accumulation.
 * @property {Set<ScoredResult>} results - Retained result set.
 */
export const ResultsAccumulator: {};
export type FileTreeNode = {
    /**
     * - File or folder name.
     */
    name: string;
    /**
     * - Full path for the node.
     */
    path?: string;
    /**
     * - Node type.
     */
    type?: "file" | "folder";
    /**
     * - Child nodes keyed by name.
     */
    children?: {
        [x: string]: FileTreeNode;
    };
};
/**
 * @typedef {Object} FileTreeNode
 * @property {string} name - File or folder name.
 * @property {string} [path] - Full path for the node.
 * @property {'file'|'folder'} [type] - Node type.
 * @property {Object.<string, FileTreeNode>} [children] - Child nodes keyed by name.
 */
export const FileTreeNode: {};
export type NormalizedError = {
    /**
     * - Human-readable error message.
     */
    message?: string;
    /**
     * - Provider or system error code.
     */
    code?: string | number;
    /**
     * - HTTP status when available.
     */
    status?: number | null;
    /**
     * - Provider-specific details.
     */
    details?: any;
    /**
     * - Raw error payload.
     */
    raw?: any;
};
/**
 * @typedef {Object} NormalizedError
 * @property {string} [message] - Human-readable error message.
 * @property {string|number} [code] - Provider or system error code.
 * @property {number|null} [status] - HTTP status when available.
 * @property {*} [details] - Provider-specific details.
 * @property {*} [raw] - Raw error payload.
 */
export const NormalizedError: {};
export type XmlFragmentNode = {
    /**
     * - XML attributes keyed by attribute name.
     */
    attributes?: {
        [x: string]: string;
    };
    /**
     * - Parsed child contents.
     */
    contents?: string | {
        [x: string]: XmlFragmentNode | XmlFragmentNode[];
    } | null;
};
/**
 * @typedef {Object} XmlFragmentNode
 * @property {Object.<string, string>} [attributes] - XML attributes keyed by attribute name.
 * @property {string|Object.<string, XmlFragmentNode|XmlFragmentNode[]>|null} [contents] - Parsed child contents.
 */
export const XmlFragmentNode: {};
export type XmlFragments = {
    [x: string]: XmlFragmentNode;
};
/**
 * @typedef {Object.<string, XmlFragmentNode>} XmlFragments
 * @description Parsed XML fragments keyed by root tag.
 */
export const XmlFragments: {};
export type InsertTextInChunksOptions = {
    /**
     * - Number of characters to insert per chunk.
     */
    chunk_size?: number;
    /**
     * - Delay between chunks in milliseconds.
     */
    delay_ms?: number;
};
/**
 * @typedef {Object} InsertTextInChunksOptions
 * @property {number} [chunk_size] - Number of characters to insert per chunk.
 * @property {number} [delay_ms] - Delay between chunks in milliseconds.
 */
export const InsertTextInChunksOptions: {};
