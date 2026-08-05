export type ClusterGroupClusterEntry = {
    /**
     * - Per-cluster filter metadata stored in the group.
     */
    filters?: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {Object} ClusterGroupClusterEntry
 * @property {Object.<string, unknown>} [filters] - Per-cluster filter metadata stored in the group.
 */
export const ClusterGroupClusterEntry: {};
export type ClusterGroupClusters = {
    [x: string]: ClusterGroupClusterEntry;
};
/**
 * @typedef {Object.<string, ClusterGroupClusterEntry>} ClusterGroupClusters
 * @description Cluster-group cluster map keyed by cluster key.
 */
export const ClusterGroupClusters: {};
export type ClusterGroupData = {
    /**
     * - Stable cluster-group key.
     */
    key?: string;
    /**
     * - Cluster references keyed by cluster key.
     */
    clusters?: import("./smart-cluster-groups.js").ClusterGroupClusters;
    /**
     * - Group-level filter metadata.
     */
    filters?: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {Object} ClusterGroupData
 * @property {string} [key] - Stable cluster-group key.
 * @property {import('./smart-cluster-groups.js').ClusterGroupClusters} [clusters] - Cluster references keyed by cluster key.
 * @property {Object.<string, unknown>} [filters] - Group-level filter metadata.
 */
export const ClusterGroupData: {};
export type ClusterGroupMemberSnapshot = {
    /**
     * - Item instance evaluated against the group.
     */
    item: unknown;
    /**
     * - Similarity scores keyed by cluster key.
     */
    clusters: {
        [x: string]: {
            score: number;
        };
    };
};
/**
 * @typedef {Object} ClusterGroupMemberSnapshot
 * @property {unknown} item - Item instance evaluated against the group.
 * @property {Object.<string, {score: number}>} clusters - Similarity scores keyed by cluster key.
 */
export const ClusterGroupMemberSnapshot: {};
export type ClusterGroupSnapshot = {
    /**
     * - Cluster instances included in the snapshot.
     */
    clusters: Array<unknown>;
    /**
     * - Item membership snapshots.
     */
    members: Array<import("./smart-cluster-groups.js").ClusterGroupMemberSnapshot>;
    /**
     * - Group-level filters applied to the snapshot.
     */
    filters: {
        [x: string]: unknown;
    };
};
/**
 * @typedef {Object} ClusterGroupSnapshot
 * @property {Array<unknown>} clusters - Cluster instances included in the snapshot.
 * @property {Array<import('./smart-cluster-groups.js').ClusterGroupMemberSnapshot>} members - Item membership snapshots.
 * @property {Object.<string, unknown>} filters - Group-level filters applied to the snapshot.
 */
export const ClusterGroupSnapshot: {};
