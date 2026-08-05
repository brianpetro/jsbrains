export type SmartGroupStats = {
    /**
     * - Count of files represented by the group.
     */
    total_files?: number;
    /**
     * - Aggregate file size represented by the group.
     */
    total_size?: number;
    /**
     * - Epoch milliseconds for the latest group scan.
     */
    last_scan?: number;
};
/**
 * @typedef {Object} SmartGroupStats
 * @property {number} [total_files] - Count of files represented by the group.
 * @property {number} [total_size] - Aggregate file size represented by the group.
 * @property {number} [last_scan] - Epoch milliseconds for the latest group scan.
 */
export const SmartGroupStats: {};
export type SmartGroupLabel = {
    /**
     * - Aggregate quality or relevance score for the label.
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
 * @typedef {Object} SmartGroupLabel
 * @property {number} [q_score] - Aggregate quality or relevance score for the label.
 * @property {Object.<string, number>} [supporting_blocks] - Supporting block scores keyed by block key.
 */
export const SmartGroupLabel: {};
export type SmartGroupMetadata = {
    /**
     * - Label metadata keyed by label.
     */
    labels?: {
        [x: string]: SmartGroupLabel;
    };
    /**
     * - Epoch milliseconds for latest member change.
     */
    last_modified?: number;
    /**
     * - Aggregate group statistics.
     */
    stats?: SmartGroupStats;
};
/**
 * @typedef {Object} SmartGroupMetadata
 * @property {Object.<string, SmartGroupLabel>} [labels] - Label metadata keyed by label.
 * @property {number} [last_modified] - Epoch milliseconds for latest member change.
 * @property {SmartGroupStats} [stats] - Aggregate group statistics.
 */
export const SmartGroupMetadata: {};
export type SmartGroupData = {
    /**
     * - Stable group key.
     */
    key?: string;
    /**
     * - Group path or display path.
     */
    path?: string;
    /**
     * - Cached median member vector.
     */
    median_vec?: Array<number> | null;
    /**
     * - Cached median block vector.
     */
    median_block_vec?: Array<number> | null;
    /**
     * - Collection key containing group members.
     */
    member_collection?: string | null;
    /**
     * - Member item keys.
     */
    members?: string[];
    /**
     * - Group metadata.
     */
    metadata?: SmartGroupMetadata;
};
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
export const SmartGroupData: {};
export type GroupAdapterModule = {
    /**
     * - Collection-level group adapter class.
     */
    collection: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Item-level group adapter class.
     */
    item: import("./smart-environment.js").SmartEnvClass;
};
/**
 * @typedef {Object} GroupAdapterModule
 * @property {import('./smart-environment.js').SmartEnvClass} collection - Collection-level group adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} item - Item-level group adapter class.
 */
export const GroupAdapterModule: {};
export type GroupVectorAdapterModule = {
    /**
     * - Collection-level vector adapter class.
     */
    collection: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Item-level vector adapter class.
     */
    item: import("./smart-environment.js").SmartEnvClass;
};
/**
 * @typedef {Object} GroupVectorAdapterModule
 * @property {import('./smart-environment.js').SmartEnvClass} collection - Collection-level vector adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} item - Item-level vector adapter class.
 */
export const GroupVectorAdapterModule: {};
export type SmartGroupsOptions = {
    /**
     * - Adapter used to build and maintain group items.
     */
    group_adapter?: GroupAdapterModule;
    /**
     * - Adapter used to compute group vectors and member rankings.
     */
    vector_adapter?: GroupVectorAdapterModule;
};
/**
 * @typedef {Object} SmartGroupsOptions
 * @property {GroupAdapterModule} [group_adapter] - Adapter used to build and maintain group items.
 * @property {GroupVectorAdapterModule} [vector_adapter] - Adapter used to compute group vectors and member rankings.
 */
export const SmartGroupsOptions: {};
export type SmartGroupMemberResult = {
    /**
     * - Member item instance.
     */
    item: any;
    /**
     * - Similarity or ranking score.
     */
    score: number;
};
/**
 * @typedef {Object} SmartGroupMemberResult
 * @property {*} item - Member item instance.
 * @property {number} score - Similarity or ranking score.
 */
export const SmartGroupMemberResult: {};
