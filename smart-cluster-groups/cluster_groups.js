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
  data_dir = 'cluster_groups';
  async create_group(center_keys) {
    console.log('create_group', center_keys);
    const clusters = [];
    for(let i = 0; i < center_keys.length; i++) {
      const center_key = center_keys[i];
      const cluster = await this.env.clusters.create_or_update({
        center: {
          [center_key]: {
            weight: 1,
          }
        },
      });
      clusters.push(cluster);
    }
    await this.create_or_update({
      clusters: clusters.reduce((acc, cluster) => {
        acc[cluster.key] = { filters: {} };
        return acc;
      }, {}),
    });
  }
}

export default ClusterGroups;
