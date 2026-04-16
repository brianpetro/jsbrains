/**
 * @typedef {Object} ClusterGroupClusterEntry
 * @property {Object.<string, *>} [filters] - Per-cluster filter metadata stored in the group.
 */
export const ClusterGroupClusterEntry = {};

/**
 * @typedef {Object.<string, ClusterGroupClusterEntry>} ClusterGroupClusters
 * @description Cluster-group cluster map keyed by cluster key.
 */
export const ClusterGroupClusters = {};

/**
 * @typedef {Object} ClusterGroupData
 * @property {string} [key] - Stable cluster-group key.
 * @property {import('./smart-cluster-groups.js').ClusterGroupClusters} [clusters] - Cluster references keyed by cluster key.
 * @property {Object.<string, *>} [filters] - Group-level filter metadata.
 */
export const ClusterGroupData = {};

/**
 * @typedef {Object} ClusterGroupMemberSnapshot
 * @property {*} item - Item instance evaluated against the group.
 * @property {Object.<string, {score: number}>} clusters - Similarity scores keyed by cluster key.
 */
export const ClusterGroupMemberSnapshot = {};

/**
 * @typedef {Object} ClusterGroupSnapshot
 * @property {Array<*>} clusters - Cluster instances included in the snapshot.
 * @property {Array<import('./smart-cluster-groups.js').ClusterGroupMemberSnapshot>} members - Item membership snapshots.
 * @property {Object.<string, *>} filters - Group-level filters applied to the snapshot.
 */
export const ClusterGroupSnapshot = {};
