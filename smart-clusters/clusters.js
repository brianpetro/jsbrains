/**
 * @file clusters.js
 * @description Collection of Cluster items, extends SmartEntities.
 */

import { Collection } from 'smart-collections';

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
}