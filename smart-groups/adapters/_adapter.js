/**
 * @file _adapter.js
 * @description Base adapter classes for Groups (clusters, directories).
 *
 * Similar to how SourceContentAdapter works for sources, we have a GroupAdapter interface
 * and concrete implementations that handle building and maintaining directory groups.
 */

/**
 * @interface GroupAdapter
 * @description
 * Provides an interface for building and maintaining groups from underlying data sources.
 * Groups are collections of items (e.g., directories) derived from another primary collection (e.g., sources).
 */
export class GroupCollectionAdapter {
  /**
   * @constructor
   * @param {Object} collection - The group collection instance.
   */
  constructor(collection) {
    this.collection = collection;
  }
  /**
   * Build groups by scanning the primary source collection.
   * This should identify group keys (e.g., directory paths) and create/update items.
   * @async
   * @abstract
   * @returns {Promise<void>}
   */
  async build_groups() { throw new Error("Not implemented"); }
}

export class GroupItemAdapter {
}

export default {
  collection: GroupCollectionAdapter,
  item: GroupItemAdapter
};

