export type BlockLineRange = Array<number>;
/**
 * @typedef {Array<number>} BlockLineRange
 * @description Inclusive [start_line, end_line] range for a block.
 */
export const BlockLineRange: number[];
export type ParsedTaskCollections = {
    /**
     * - Parsed markdown task line groupings.
     */
    incomplete?: {
        all: Array<number>;
        top: Array<number>;
    };
};
/**
 * @typedef {Object} ParsedTaskCollections
 * @property {{all: Array<number>, top: Array<number>}} [incomplete] - Parsed markdown task line groupings.
 */
export const ParsedTaskCollections: {};
export type MarkdownBlocksParseResult = {
    /**
     * - Parsed block ranges keyed by block path.
     */
    blocks: {
        [x: string]: BlockLineRange;
    };
    /**
     * - Line numbers containing markdown tasks.
     */
    task_lines: Array<number>;
    /**
     * - Additional task groupings.
     */
    tasks: import("./smart-blocks.js").ParsedTaskCollections;
    /**
     * - Inclusive fenced code block ranges.
     */
    codeblock_ranges: Array<import("./smart-blocks.js").BlockLineRange>;
};
/**
 * @typedef {Object} MarkdownBlocksParseResult
 * @property {Object.<string, import('./smart-blocks.js').BlockLineRange>} blocks - Parsed block ranges keyed by block path.
 * @property {Array<number>} task_lines - Line numbers containing markdown tasks.
 * @property {import('./smart-blocks.js').ParsedTaskCollections} tasks - Additional task groupings.
 * @property {Array<import('./smart-blocks.js').BlockLineRange>} codeblock_ranges - Inclusive fenced code block ranges.
 */
export const MarkdownBlocksParseResult: {};
export type BlockDisplayParams = {
    /**
     * - Whether to include the full source path in display labels.
     */
    show_full_path?: boolean;
};
/**
 * @typedef {Object} BlockDisplayParams
 * @property {boolean} [show_full_path] - Whether to include the full source path in display labels.
 */
export const BlockDisplayParams: {};
export type SmartBlockData = {
    /**
     * - Stable block key.
     */
    key?: string;
    /**
     * - Inclusive line range for the block.
     */
    lines?: import("./smart-blocks.js").BlockLineRange;
    /**
     * - Character length of the current block content.
     */
    size?: number;
    /**
     * - Optional cached block text.
     */
    text?: string | null;
    /**
     * - Optional cached text length.
     */
    length?: number;
    /**
     * - Outlinks discovered within the block.
     */
    outlinks?: import("./smart-sources.js").LinkObject[];
    /**
     * - Most recent read metadata.
     */
    last_read?: import("./smart-entities.js").EntityLastRead;
    /**
     * - Per-model embedding data.
     */
    embeddings?: import("./smart-entities.js").EntityEmbeddingsMap;
};
/**
 * @typedef {Object} SmartBlockData
 * @property {string} [key] - Stable block key.
 * @property {import('./smart-blocks.js').BlockLineRange} [lines] - Inclusive line range for the block.
 * @property {number} [size] - Character length of the current block content.
 * @property {string|null} [text] - Optional cached block text.
 * @property {number} [length] - Optional cached text length.
 * @property {import('./smart-sources.js').LinkObject[]} [outlinks] - Outlinks discovered within the block.
 * @property {import('./smart-entities.js').EntityLastRead} [last_read] - Most recent read metadata.
 * @property {import('./smart-entities.js').EntityEmbeddingsMap} [embeddings] - Per-model embedding data.
 */
export const SmartBlockData: {};
