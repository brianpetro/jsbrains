export type ClusterMembershipState = number;
/**
 * @typedef {number} ClusterMembershipState
 * @description Expected values are -1 for removed, 0 for neutral, and 1 for added.
 */
export const ClusterMembershipState: 0;
export type ClusterCenterEntry = {
    /**
     * - Relative weight for a center item.
     */
    weight?: number;
    /**
     * - Optional explicit center vector.
     */
    vec?: Array<number>;
};
/**
 * @typedef {Object} ClusterCenterEntry
 * @property {number} [weight] - Relative weight for a center item.
 * @property {Array<number>} [vec] - Optional explicit center vector.
 */
export const ClusterCenterEntry: {};
export type ClusterCenters = {
    [x: string]: ClusterCenterEntry;
};
/**
 * @typedef {Object.<string, ClusterCenterEntry>} ClusterCenters
 * @description Cluster centers keyed by source or item key.
 */
export const ClusterCenters: {};
export type ClusterMemberEntry = {
    /**
     * - Membership state for the item.
     */
    state: import("./smart-clusters.js").ClusterMembershipState;
};
/**
 * @typedef {Object} ClusterMemberEntry
 * @property {import('./smart-clusters.js').ClusterMembershipState} state - Membership state for the item.
 */
export const ClusterMemberEntry: {};
export type ClusterMembers = {
    [x: string]: ClusterMemberEntry;
};
/**
 * @typedef {Object.<string, ClusterMemberEntry>} ClusterMembers
 * @description Cluster members keyed by item key.
 */
export const ClusterMembers: {};
export type ClusterData = {
    /**
     * - Stable sim-hash key for the cluster.
     */
    key?: string;
    /**
     * - Center items and weights.
     */
    center?: import("./smart-clusters.js").ClusterCenters;
    /**
     * - Cached centroid or center vector.
     */
    center_vec?: Array<number>;
    /**
     * - Membership state keyed by item key.
     */
    members?: import("./smart-clusters.js").ClusterMembers;
    /**
     * - Cluster-level filter metadata.
     */
    filters?: {
        [x: string]: unknown;
    };
    /**
     * - Optional owning cluster-group key.
     */
    group_key?: string;
};
/**
 * @typedef {Object} ClusterData
 * @property {string} [key] - Stable sim-hash key for the cluster.
 * @property {import('./smart-clusters.js').ClusterCenters} [center] - Center items and weights.
 * @property {Array<number>} [center_vec] - Cached centroid or center vector.
 * @property {import('./smart-clusters.js').ClusterMembers} [members] - Membership state keyed by item key.
 * @property {Object.<string, unknown>} [filters] - Cluster-level filter metadata.
 * @property {string} [group_key] - Optional owning cluster-group key.
 */
export const ClusterData: {};
export type ClusterMembershipSummary = {
    /**
     * - Item instance included in the summary.
     */
    item: unknown;
    /**
     * - Similarity score against the cluster vector.
     */
    score?: number;
    /**
     * - Membership state after the operation.
     */
    state: import("./smart-clusters.js").ClusterMembershipState;
};
/**
 * @typedef {Object} ClusterMembershipSummary
 * @property {unknown} item - Item instance included in the summary.
 * @property {number} [score] - Similarity score against the cluster vector.
 * @property {import('./smart-clusters.js').ClusterMembershipState} state - Membership state after the operation.
 */
export const ClusterMembershipSummary: {};
