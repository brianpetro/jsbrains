/**
 * @file clusters.js
 * @description Collection of Cluster items, extends SmartEntities.
 */

import { Collection } from 'smart-collections';
import { Cluster } from './cluster.js';

/**
 * @class Clusters
 * @extends Collection
 * @classdesc
 * A collection of `Cluster` items. Manages creation, updates, and embedding logic if needed.
 */
export class Clusters extends Collection {
  data_dir = 'clusters';
  find_by(data) {
    return null;
  }
  get item_type () {
    return Cluster;
  }
}