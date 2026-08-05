export type SmartDirectoryStats = {
    /**
     * - Number of files contained in the directory.
     */
    total_files?: number;
    /**
     * - Aggregate size of files contained in the directory.
     */
    total_size?: number;
    /**
     * - Epoch milliseconds for the last directory scan.
     */
    last_scan?: number;
};
/**
 * @typedef {Object} SmartDirectoryStats
 * @property {number} [total_files] - Number of files contained in the directory.
 * @property {number} [total_size] - Aggregate size of files contained in the directory.
 * @property {number} [last_scan] - Epoch milliseconds for the last directory scan.
 */
export const SmartDirectoryStats: {};
export type SmartDirectoryLabel = {
    /**
     * - Aggregate label quality or relevance score.
     */
    q_score?: number;
    /**
     * - Supporting block scores keyed by block key.
     */
    supporting_blocks?: {
        [x: string]: number;
    };
};
/**
 * @typedef {Object} SmartDirectoryLabel
 * @property {number} [q_score] - Aggregate label quality or relevance score.
 * @property {Object.<string, number>} [supporting_blocks] - Supporting block scores keyed by block key.
 */
export const SmartDirectoryLabel: {};
export type SmartDirectoryMetadata = {
    /**
     * - Label metadata keyed by label.
     */
    labels?: {
        [x: string]: SmartDirectoryLabel;
    };
    /**
     * - Epoch milliseconds for latest source change.
     */
    last_modified?: number;
    /**
     * - Aggregate directory statistics.
     */
    stats?: SmartDirectoryStats;
};
/**
 * @typedef {Object} SmartDirectoryMetadata
 * @property {Object.<string, SmartDirectoryLabel>} [labels] - Label metadata keyed by label.
 * @property {number} [last_modified] - Epoch milliseconds for latest source change.
 * @property {SmartDirectoryStats} [stats] - Aggregate directory statistics.
 */
export const SmartDirectoryMetadata: {};
export type SmartDirectoryData = {
    /**
     * - Stable directory key.
     */
    key?: string;
    /**
     * - Normalized directory path, usually ending with `/`.
     */
    path?: string;
    /**
     * - Cached median source vector.
     */
    median_vec?: Array<number> | null;
    /**
     * - Cached median block vector.
     */
    median_block_vec?: Array<number> | null;
    /**
     * - Cached source keys contained by the directory.
     */
    sources?: string[];
    /**
     * - Directory metadata.
     */
    metadata?: SmartDirectoryMetadata;
    /**
     * - Cached UI expanded/collapsed state.
     */
    env_settings_expanded_view?: boolean;
};
/**
 * @typedef {Object} SmartDirectoryData
 * @property {string} [key] - Stable directory key.
 * @property {string} [path] - Normalized directory path, usually ending with `/`.
 * @property {Array<number>|null} [median_vec] - Cached median source vector.
 * @property {Array<number>|null} [median_block_vec] - Cached median block vector.
 * @property {string[]} [sources] - Cached source keys contained by the directory.
 * @property {SmartDirectoryMetadata} [metadata] - Directory metadata.
 * @property {boolean} [env_settings_expanded_view] - Cached UI expanded/collapsed state.
 */
export const SmartDirectoryData: {};
export type SmartDirectoryReadEntry = {
    /**
     * - Child path.
     */
    path: string;
    /**
     * - Child entry type.
     */
    type: "file" | "folder" | string;
};
/**
 * @typedef {Object} SmartDirectoryReadEntry
 * @property {string} path - Child path.
 * @property {'file'|'folder'|string} type - Child entry type.
 */
export const SmartDirectoryReadEntry: {};
export type SourceDirectoryBuildState = {
    /**
     * - Directory paths created during source scanning.
     */
    created_dirs?: Set<string>;
};
/**
 * @typedef {Object} SourceDirectoryBuildState
 * @property {Set<string>} [created_dirs] - Directory paths created during source scanning.
 */
export const SourceDirectoryBuildState: {};
