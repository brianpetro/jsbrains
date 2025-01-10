/**
 * @file _adapter.js
 * @description Base adapter classes for building clusters from sources (or other items).
 */

/**
 * @class ClusterCollectionAdapter
 * @classdesc
 * Interface for a collection-level adapter that can build clusters from environment items.
 */
export class ClusterCollectionAdapter {
  /**
   * @constructor
   * @param {Object} collection - The cluster collection instance.
   */
  constructor(collection) {
    this.collection = collection;
  }

  /**
   * @async
   * Build clusters. (No-op by default.)
   */
  async build_groups() {
    throw new Error("Not implemented. Override in subclass.");
  }
}

/**
 * @class ClusterItemAdapter
 * @classdesc
 * Interface for item-level logic if needed for cluster items.
 */
export class ClusterItemAdapter {
  /**
   * @constructor
   * @param {Object} item - The cluster item instance.
   */
  constructor(item) {
    this.item = item;
  }
}

export default {
  collection: ClusterCollectionAdapter,
  item: ClusterItemAdapter
};
