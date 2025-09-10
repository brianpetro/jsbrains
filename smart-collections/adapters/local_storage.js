/**
 * @file localstorage_web.js
 * @description
 * Provides adapters for storing smart collections in the browser's `localStorage`. 
 * Each collection is stored under a prefix derived from the collection_key. 
 * Each item is stored under a key that combines the prefix with the item's key. 
 * Deletions are handled by removing the relevant entry from localStorage.
 * 
 * This adapter is suitable for web applications that need to store data in the
 * client-side browser environment without relying on a file system.
 */

import { CollectionDataAdapter, ItemDataAdapter } from './_adapter.js';

/**
 * @class LocalStorageCollectionDataAdapter
 * @extends CollectionDataAdapter
 * @description
 * A collection-level adapter that reads/writes items to/from localStorage. 
 * Batch operations (load/save queue) are no-ops in this simplified localStorage scenario,
 * because each item is loaded/saved individually.
 */
export class LocalStorageCollectionDataAdapter extends CollectionDataAdapter {
  /**
   * The class to use for item adapters.
   * @type {typeof ItemDataAdapter}
   */
  ItemDataAdapter = LocalStorageItemDataAdapter;

  /**
   * @constructor
   * @param {Object} collection - The collection instance this adapter manages.
   */
  constructor(collection) {
    super(collection);
    /**
     * Used as the localStorage prefix: `smart_collections:{collection_key}`
     * @type {string}
     */
    this.storage_prefix = `smart_collections:${this.collection.collection_key}`;
  }

  /**
   * Load a single item by its key.
   * @async
   * @param {string} key
   * @returns {Promise<void>}
   */
  async load_item(key) {
    const item = this.collection.get(key);
    if (!item) return;
    const adapter = this.create_item_adapter(item);
    await adapter.load();
  }

  /**
   * Save a single item by its key.
   * @async
   * @param {string} key
   * @returns {Promise<void>}
   */
  async save_item(key) {
    const item = this.collection.get(key);
    if (!item) return;
    const adapter = this.create_item_adapter(item);
    await adapter.save();
  }

  /**
   * Delete a single item by its key.
   * @async
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete_item(key) {
    window.localStorage.removeItem(`${this.storage_prefix}:${key}`);
  }

  /**
   * Process any queued load operations. In localStorage, data is immediately available,
   * so we simply run load for each item in the queue.
   * @async
   * @returns {Promise<void>}
   */
  async process_load_queue() {
    const load_queue = Object.values(this.collection.items).filter(item => item._queue_load);
    if (!load_queue.length) return;

    // Show notice if available
    this.collection.emit_event('collection:load_started');
    this.collection.notices?.show('loading_collection', { collection_key: this.collection.collection_key });


    // Load each item individually
    for (const item of load_queue) {
      const adapter = this.create_item_adapter(item);
      try {
        await adapter.load();
      } catch (e) {
        console.warn(`Error loading item ${item.key}`, e);
        item.queue_load(); // re-queue or handle differently
      }
    }

    this.collection.loaded = load_queue.length;
    this.collection.notices?.remove('loading_collection');
    this.collection.emit_event('collection:load_completed');

  }

  /**
   * Process any queued save operations. For localStorage, just call save on each queued item.
   * @async
   * @returns {Promise<void>}
   */
  async process_save_queue() {
    const save_queue = Object.values(this.collection.items).filter(item => item._queue_save);
    if (!save_queue.length) return;

    // Show notice if available
    this.collection.emit_event('collection:save_started');
    this.collection.notices?.show('saving_collection', { collection_key: this.collection.collection_key });


    for (const item of save_queue) {
      const adapter = this.create_item_adapter(item);
      try {
        await adapter.save();
      } catch (e) {
        console.warn(`Error saving item ${item.key}`, e);
        item.queue_save(); 
      }
    }

    this.collection.notices?.remove('saving_collection');
    this.collection.emit_event('collection:save_completed');
  }
}

/**
 * @class LocalStorageItemDataAdapter
 * @extends ItemDataAdapter
 * @description
 * Manages reading and writing a single item's data from/to localStorage.
 * The key for each item is: `{collection_storage_prefix}:{item_key}`.
 */
export class LocalStorageItemDataAdapter extends ItemDataAdapter {
  /**
   * @returns {string} The localStorage key used for this item.
   */
  get data_path() {
    const collection_adapter = /** @type {LocalStorageCollectionDataAdapter} */ (this.collection_adapter);
    return `${collection_adapter.storage_prefix}:${this.item.key}`;
  }

  /**
   * Load this item from localStorage.
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    try {
      const raw = window.localStorage.getItem(this.data_path);
      if (raw === null) {
        // If the item doesn't exist, we consider it for potential import or creation
        this.item.queue_import?.();
        return;
      }
      const data = JSON.parse(raw);
      // Merge loaded data into the item
      this.item.data = data;
      this.item._queue_load = false;
      this.item.loaded_at = Date.now();
    } catch (e) {
      console.warn("Error loading item (queueing import)", this.item.key, this.data_path, e);
      this.item.queue_import?.();
    }
  }

  /**
   * Save this item to localStorage (either as JSON or null if deleted).
   * @async
   * @returns {Promise<void>}
   */
  async save() {
    try {
      if (this.item.deleted) {
        window.localStorage.removeItem(this.data_path);
      } else {
        window.localStorage.setItem(this.data_path, JSON.stringify(this.item.data));
      }
      this.item._queue_save = false;
    } catch (e) {
      console.warn("Error saving item", this.data_path, e);
      // Re-queue if something went wrong
      this.item.queue_save();
    }
  }

  /**
   * Delete the item data from localStorage, marking as deleted.
   * @async
   * @returns {Promise<void>}
   */
  async delete() {
    try {
      window.localStorage.removeItem(this.data_path);
    } catch (e) {
      console.warn("Error deleting item", this.data_path, e);
    }
    this.item.deleted = true;
  }

  /**
   * Load the item's data from localStorage if it has been updated externally.
   * In localStorage, there's no reliable timestamp for item changes,
   * so this is effectively the same as a normal load.
   * @async
   */
  async load_if_updated() {
    await this.load();
  }
}

/**
 * Default export matches the pattern of other adapters:
 * { collection: LocalStorageCollectionDataAdapter, item: LocalStorageItemDataAdapter }
 */
export default {
  collection: LocalStorageCollectionDataAdapter,
  item: LocalStorageItemDataAdapter
};