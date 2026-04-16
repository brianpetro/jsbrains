/**
 * @typedef {number} ClusterMembershipState
 * @description Expected values are -1 for removed, 0 for neutral, and 1 for added.
 */
export const ClusterMembershipState = 0;

/**
 * @typedef {Object} ClusterCenterEntry
 * @property {number} [weight] - Relative weight for a center item.
 * @property {Array<number>} [vec] - Optional explicit center vector.
 */
export const ClusterCenterEntry = {};

/**
 * @typedef {Object.<string, ClusterCenterEntry>} ClusterCenters
 * @description Cluster centers keyed by source or item key.
 */
export const ClusterCenters = {};

/**
 * @typedef {Object} ClusterMemberEntry
 * @property {import('./smart-clusters.js').ClusterMembershipState} state - Membership state for the item.
 */
export const ClusterMemberEntry = {};

/**
 * @typedef {Object.<string, ClusterMemberEntry>} ClusterMembers
 * @description Cluster members keyed by item key.
 */
export const ClusterMembers = {};

/**
 * @typedef {Object} ClusterData
 * @property {string} [key] - Stable sim-hash key for the cluster.
 * @property {import('./smart-clusters.js').ClusterCenters} [center] - Center items and weights.
 * @property {Array<number>} [center_vec] - Cached centroid or center vector.
 * @property {import('./smart-clusters.js').ClusterMembers} [members] - Membership state keyed by item key.
 * @property {Object.<string, *>} [filters] - Cluster-level filter metadata.
 * @property {string} [group_key] - Optional owning cluster-group key.
 */
export const ClusterData = {};

/**
 * @typedef {Object} ClusterMembershipSummary
 * @property {*} item - Item instance included in the summary.
 * @property {number} [score] - Similarity score against the cluster vector.
 * @property {import('./smart-clusters.js').ClusterMembershipState} state - Membership state after the operation.
 */
export const ClusterMembershipSummary = {};
