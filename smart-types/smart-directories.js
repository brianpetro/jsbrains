/**
 * @typedef {Object} SmartDirectoryStats
 * @property {number} [total_files] - Number of files contained in the directory.
 * @property {number} [total_size] - Aggregate size of files contained in the directory.
 * @property {number} [last_scan] - Epoch milliseconds for the last directory scan.
 */
export const SmartDirectoryStats = {};

/**
 * @typedef {Object} SmartDirectoryLabel
 * @property {number} [q_score] - Aggregate label quality or relevance score.
 * @property {Object.<string, number>} [supporting_blocks] - Supporting block scores keyed by block key.
 */
export const SmartDirectoryLabel = {};

/**
 * @typedef {Object} SmartDirectoryMetadata
 * @property {Object.<string, SmartDirectoryLabel>} [labels] - Label metadata keyed by label.
 * @property {number} [last_modified] - Epoch milliseconds for latest source change.
 * @property {SmartDirectoryStats} [stats] - Aggregate directory statistics.
 */
export const SmartDirectoryMetadata = {};

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
export const SmartDirectoryData = {};

/**
 * @typedef {Object} SmartDirectoryReadEntry
 * @property {string} path - Child path.
 * @property {'file'|'folder'|string} type - Child entry type.
 */
export const SmartDirectoryReadEntry = {};

/**
 * @typedef {Object} SourceDirectoryBuildState
 * @property {Set<string>} [created_dirs] - Directory paths created during source scanning.
 */
export const SourceDirectoryBuildState = {};
