import { FileCollectionDataAdapter, FileItemDataAdapter } from './_file.js';

/**
 * Adapter for handling multi-file data storage for smart collections using AJSON.
 * This class implements the CollectionDataAdapter interface.
 * 
 * Responsibilities:
 * - Handle collection-level operations (loading all items, saving all items, queues)
 * - Create and manage ItemDataAdapter instances for each item.
 */
export class AjsonMultiFileCollectionDataAdapter extends FileCollectionDataAdapter {
}

/**
 * Item-level data adapter for AJSON multi-file storage.
 * Handles reading, writing, and deletion of a single item's data.
 */
export class AjsonMultiFileItemDataAdapter extends FileItemDataAdapter {
}