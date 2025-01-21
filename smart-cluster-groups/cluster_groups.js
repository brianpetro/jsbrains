/**
 * @file cluster_groups.js
 * @description A collection of ClusterGroup items, extends SmartGroups.
 */

import { Collection } from 'smart-collections';

/**
 * @class ClusterGroups
 * @extends Collection
 * @classdesc
 * Manages multiple cluster-group definitions and merges, etc.
 */
export class ClusterGroups extends Collection {
  /**
   * @constructor
   * @param {Object} env - The environment instance.
   * @param {Object} [opts={}] - optional config
   */
  constructor(env, opts = {}) {
    super(env, opts);
  }

  async create_group(center_keys) {
    console.log('create_group', center_keys);
    const timestamp = Date.now().toString();
    const clusters = [];
    for(let i = 0; i < center_keys.length; i++) {
      const center_key = center_keys[i];
      const cluster = await this.env.clusters.create_or_update({
        key: timestamp + '-' + i,
        center: {
          [center_key]: {
            weight: 1,
          }
        },
      });
      clusters.push(cluster);
    }
    await this.create_or_update({
      key: timestamp,
      clusters: clusters.reduce((acc, cluster) => {
        acc[cluster.key] = { filters: {} };
        return acc;
      }, {}),
    });
  }
}

export default ClusterGroups;
