import { CollectionDataAdapter, ItemDataAdapter } from './_adapter.js';

/**
 * @class FileCollectionDataAdapter
 * @extends CollectionDataAdapter
 * @description
 * A base class for collection-level adapters that interact with a file system.
 * Provides `this.fs` as a convenience for filesystem operations.
 */
export class FileCollectionDataAdapter extends CollectionDataAdapter {
  /**
   * @returns {Object} Filesystem interface derived from environment or collection settings.
   */
  get fs() {
    return this.collection.data_fs || this.collection.env.data_fs;
  }
}

/**
 * @class FileItemDataAdapter
 * @extends ItemDataAdapter
 * @description
 * A base class for item-level adapters that interact with a file system.
 * Provides `this.fs` as a convenience for filesystem operations.
 */
export class FileItemDataAdapter extends ItemDataAdapter {
  /**
   * @returns {Object} Filesystem interface derived from environment or collection settings.
   */
  get fs() {
    return this.item.collection.data_fs || this.item.collection.env.data_fs;
  }
}
