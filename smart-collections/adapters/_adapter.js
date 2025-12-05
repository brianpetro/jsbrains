/**
 * @interface CollectionDataAdapter
 * @description
 * Provides an interface for collection-level data operations, such as loading and saving multiple items,
 * processing queues, and orchestrating batch operations.
 *
 * This adapter does not handle individual item file reading or writing directly, but delegates that
 * to `ItemDataAdapter` instances.
 */
export class CollectionDataAdapter {
  /**
   * @constructor
   * @param {Object} collection - The collection instance that this adapter manages.
   */
  constructor(collection) {
    /** @type {Object} */
    this.collection = collection;
    this.env = collection.env;
  }
  /**
   * The class to use for item adapters.
   * @type {typeof ItemDataAdapter}
   */
  ItemDataAdapter = ItemDataAdapter;

  /**
   * Optional factory method to create item adapters.
   * If `this.item_adapter_class` is not null, it uses that; otherwise can be overridden by subclasses.
   * @param {Object} item - The item to create an adapter for.
   * @returns {ItemDataAdapter}
   */
  create_item_adapter(item) {
    if (!this.ItemDataAdapter) {
      throw new Error("No item_adapter_class specified and create_item_adapter not overridden.");
    }
    return new this.ItemDataAdapter(item);
  }

  /**
   * Load a single item by its key using an `ItemDataAdapter`.
   * @async
   * @abstract
   * @param {string} key - The key of the item to load.
   * @returns {Promise<void>} Resolves when the item is loaded.
   */
  async load_item(key) { throw new Error('Not implemented'); }

  /**
   * Save a single item by its key using its associated `ItemDataAdapter`.
   * @async
   * @abstract
   * @param {string} key - The key of the item to save.
   * @returns {Promise<void>} Resolves when the item is saved.
   */
  async save_item(key) { throw new Error('Not implemented'); }

  /**
   * Delete a single item by its key. This may involve updating or removing its file,
   * as handled by the `ItemDataAdapter`.
   * @async
   * @abstract
   * @param {string} key - The key of the item to delete.
   * @returns {Promise<void>} Resolves when the item is deleted.
   */
  async delete_item(key) { throw new Error('Not implemented'); }

  /**
   * Process any queued load operations. Typically orchestrates calling `load_item()`
   * on items that have been flagged for loading.
   * @async
   * @abstract
   * @returns {Promise<void>}
   */
  async process_load_queue() { throw new Error('Not implemented'); }

  /**
   * Process any queued save operations. Typically orchestrates calling `save_item()`
   * on items that have been flagged for saving.
   * @async
   * @abstract
   * @returns {Promise<void>}
   */
  async process_save_queue() { throw new Error('Not implemented'); }

  /**
   * Load the item's data from storage if it has been updated externally.
   * @async
   * @param {string} key - The key of the item to load.
   * @returns {Promise<void>} Resolves when the item is loaded.
   */
  async load_item_if_updated(item) {
    const adapter = this.create_item_adapter(item);
    await adapter.load_if_updated();
  }

  /**
   * Clear all data associated with this collection.
   * @async
   * @abstract
   * @returns {Promise<void>}
   */
  async clear_all() {
    throw new Error('Not implemented');
  }
}


/**
 * @interface ItemDataAdapter
 * @description
 * Provides an interface for item-level data operations. Responsible for reading,
 * writing, and deleting the data for a single item. It is meant to be used by the
 * `CollectionDataAdapter` to handle individual item I/O.
 */
export class ItemDataAdapter {
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
   * @abstract
   * @returns {Promise<void>} Resolves when the item is fully loaded.
   */
  async load() { throw new Error('Not implemented'); }

  /**
   * Save the item's data to storage. May involve writing to a file or appending
   * lines in an append-only format.
   * @async
   * @abstract
   * @param {string|null} [ajson=null] - An optional serialized representation of the item’s data.
   *                                     If not provided, the adapter should derive it from the item.
   * @returns {Promise<void>} Resolves when the item is saved.
   */
  async save(ajson = null) { throw new Error('Not implemented'); }

  /**
   * Delete the item's data from storage. May involve removing a file or writing
   * a `null` entry in an append-only file to signify deletion.
   * @async
   * @abstract
   * @returns {Promise<void>} Resolves when the item’s data is deleted.
   */
  async delete() { throw new Error('Not implemented'); }

  /**
   * Returns the file path or unique identifier used by this adapter to locate and store
   * the item's data. This may be a file name derived from the item's key.
   * @abstract
   * @returns {string} The path or identifier for the item's data.
   */
  get data_path() { throw new Error('Not implemented'); }

  /**
   * @returns {CollectionDataAdapter} The collection data adapter that this item data adapter belongs to.
   */
  get collection_adapter() {
    return this.item.collection.data_adapter;
  }
  get env() {
    return this.item.env;
  }

  /**
   * Load the item's data from storage if it has been updated externally.
   * @async
   * @abstract
   * @returns {Promise<void>} Resolves when the item is loaded.
   */
  async load_if_updated() { throw new Error('Not implemented'); }
}

export default {
  collection: CollectionDataAdapter,
  item: ItemDataAdapter
};