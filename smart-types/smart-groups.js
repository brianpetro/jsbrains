/**
 * @typedef {Object} SmartGroupStats
 * @property {number} [total_files] - Count of files represented by the group.
 * @property {number} [total_size] - Aggregate file size represented by the group.
 * @property {number} [last_scan] - Epoch milliseconds for the latest group scan.
 */
export const SmartGroupStats = {};

/**
 * @typedef {Object} SmartGroupLabel
 * @property {number} [q_score] - Aggregate quality or relevance score for the label.
 * @property {Object.<string, number>} [supporting_blocks] - Supporting block scores keyed by block key.
 */
export const SmartGroupLabel = {};

/**
 * @typedef {Object} SmartGroupMetadata
 * @property {Object.<string, SmartGroupLabel>} [labels] - Label metadata keyed by label.
 * @property {number} [last_modified] - Epoch milliseconds for latest member change.
 * @property {SmartGroupStats} [stats] - Aggregate group statistics.
 */
export const SmartGroupMetadata = {};

/**
 * @typedef {Object} SmartGroupData
 * @property {string} [key] - Stable group key.
 * @property {string} [path] - Group path or display path.
 * @property {Array<number>|null} [median_vec] - Cached median member vector.
 * @property {Array<number>|null} [median_block_vec] - Cached median block vector.
 * @property {string|null} [member_collection] - Collection key containing group members.
 * @property {string[]} [members] - Member item keys.
 * @property {SmartGroupMetadata} [metadata] - Group metadata.
 */
export const SmartGroupData = {};

/**
 * @typedef {Object} GroupAdapterModule
 * @property {import('./smart-environment.js').SmartEnvClass} collection - Collection-level group adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} item - Item-level group adapter class.
 */
export const GroupAdapterModule = {};

/**
 * @typedef {Object} GroupVectorAdapterModule
 * @property {import('./smart-environment.js').SmartEnvClass} collection - Collection-level vector adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} item - Item-level vector adapter class.
 */
export const GroupVectorAdapterModule = {};

/**
 * @typedef {Object} SmartGroupsOptions
 * @property {GroupAdapterModule} [group_adapter] - Adapter used to build and maintain group items.
 * @property {GroupVectorAdapterModule} [vector_adapter] - Adapter used to compute group vectors and member rankings.
 */
export const SmartGroupsOptions = {};

/**
 * @typedef {Object} SmartGroupMemberResult
 * @property {*} item - Member item instance.
 * @property {number} score - Similarity or ranking score.
 */
export const SmartGroupMemberResult = {};
