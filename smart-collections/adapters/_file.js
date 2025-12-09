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
   * The class to use for item adapters.
   * @type {typeof ItemDataAdapter}
   */
  ItemDataAdapter = FileItemDataAdapter;

  /**
   * @returns {Object} Filesystem interface derived from environment or collection settings.
   */
  get fs() {
    return this.collection.data_fs || this.collection.env.data_fs;
  }
  async clear_all() {
    await this.fs.remove_dir(this.collection.data_dir, true);
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
  /**
   * Resolve the file path for the item's data.
   * @abstract
   * @returns {string} Path to the persisted item data.
   */
  get data_path() { throw new Error('Not implemented'); }

  async load_if_updated() {
    const data_path = this.data_path;
    if(await this.fs.exists(data_path)) {
      const loaded_at = this.item.loaded_at || 0;
      const data_file_stat = await this.fs.stat(data_path);
      if(data_file_stat.mtime > (loaded_at + 1 * 60 * 1000)) {
        console.log(`Smart Collections: Re-loading item ${this.item.key} because it has been updated on disk`);
        await this.load();
      }
    }
  }
}

export default {
  collection: FileCollectionDataAdapter,
  item: FileItemDataAdapter
};