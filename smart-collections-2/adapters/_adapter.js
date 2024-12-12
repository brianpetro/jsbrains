/**
 * @interface CollectionDataAdapter
 * @description
 * Provides an interface for collection-level data operations, such as loading and saving multiple items,
 * processing queues, and orchestrating batch operations. This adapter does not handle individual item 
 * file reading or writing directly, but delegates that to `ItemDataAdapter` instances.
 */
class CollectionDataAdapter {
  /**
   * @constructor
   * @param {Object} collection - The collection instance that this adapter manages.
   */
  constructor(collection) {
    /** @type {Object} */
    this.collection = collection;
  }

  /**
   * Load all items from the underlying data storage into the collection.
   * This may initiate a batch load operation that uses multiple item adapters.
   * @async
   * @returns {Promise<void>} Resolves when the load operation is complete.
   */
  async load_all_items() { throw new Error('Not implemented'); }

  /**
   * Save all items that require saving to the underlying data storage.
   * Typically processes all items queued for saving and delegates the actual I/O 
   * to individual `ItemDataAdapter` instances.
   * @async
   * @returns {Promise<void>} Resolves when the save operation is complete.
   */
  async save_all_items() { throw new Error('Not implemented'); }

  /**
   * Load a single item by its key using an `ItemDataAdapter`.
   * @async
   * @param {string} key - The key of the item to load.
   * @returns {Promise<void>} Resolves when the item is loaded.
   */
  async load_item(key) { throw new Error('Not implemented'); }

  /**
   * Save a single item by its key using its associated `ItemDataAdapter`.
   * @async
   * @param {string} key - The key of the item to save.
   * @returns {Promise<void>} Resolves when the item is saved.
   */
  async save_item(key) { throw new Error('Not implemented'); }

  /**
   * Delete a single item by its key. This may involve updating or removing its file,
   * as handled by the `ItemDataAdapter`.
   * @async
   * @param {string} key - The key of the item to delete.
   * @returns {Promise<void>} Resolves when the item is deleted.
   */
  async delete_item(key) { throw new Error('Not implemented'); }

  /**
   * Process any queued load operations. Typically orchestrates calling `load_item()` 
   * on items that have been flagged for loading.
   * @async
   * @returns {Promise<void>}
   */
  async process_load_queue() { throw new Error('Not implemented'); }

  /**
   * Process any queued save operations. Typically orchestrates calling `save_item()` 
   * on items that have been flagged for saving.
   * @async
   * @returns {Promise<void>}
   */
  async process_save_queue() { throw new Error('Not implemented'); }
}


/**
 * @interface ItemDataAdapter
 * @description
 * Provides an interface for item-level data operations. Responsible for reading,
 * writing, and deleting the data for a single item. It is meant to be used by the
 * `CollectionDataAdapter` to handle individual item I/O.
 */
class ItemDataAdapter {
  /**
   * @constructor
   * @param {Object} item - The collection item instance that this adapter manages.
   */
  constructor(item) {
    /** @type {Object} */
    this.item = item;
  }

  /**
   * Load the item's data from storage. May involve reading a file and parsing 
   * its contents, then updating `item.data`.
   * @async
   * @returns {Promise<void>} Resolves when the item is fully loaded.
   */
  async load() { throw new Error('Not implemented'); }

  /**
   * Save the item's data to storage. May involve writing to a file or appending 
   * lines in an append-only format.
   * @async
   * @param {string|null} [ajson=null] - An optional serialized representation of the item’s data.
   *                                     If not provided, the adapter should derive it from the item.
   * @returns {Promise<void>} Resolves when the item is saved.
   */
  async save(ajson = null) { throw new Error('Not implemented'); }

  /**
   * Delete the item's data from storage. May involve removing a file or writing 
   * a `null` entry in an append-only file to signify deletion.
   * @async
   * @returns {Promise<void>} Resolves when the item’s data is deleted.
   */
  async delete() { throw new Error('Not implemented'); }

  /**
   * Returns the file path or unique identifier used by this adapter to locate and store 
   * the item's data. This may be a file name derived from the item's key.
   * @returns {string} The path or identifier for the item's data.
   */
  get_data_path() { throw new Error('Not implemented'); }

  /**
   * Overwrite the saved data with the current state of the item. Unlike `save()`, this 
   * may replace the entire file rather than append. Useful for cleanup or recovery operations.
   * @async
   * @param {string|null} [ajson=null] - An optional serialized representation of the item’s data.
   * @returns {Promise<void>} Resolves when the data is overwritten.
   */
  async overwrite_saved_data(ajson = null) { throw new Error('Not implemented'); }

  /**
   * @returns {CollectionDataAdapter} The collection data adapter that this item data adapter belongs to.
   */
  get collection_adapter() { return this.item.collection.data_adapter; }
}
