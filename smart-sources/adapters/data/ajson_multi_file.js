import { AjsonMultiFileCollectionDataAdapter, AjsonMultiFileItemDataAdapter } from 'smart-collections/adapters/ajson_multi_file.js';

/**
 * @class AjsonMultiFileSourcesDataAdapter
 * @extends AjsonMultiFileCollectionDataAdapter
 * @description
 * Collection-level adapter for handling multi-file AJSON storage of sources and their blocks.
 * Each source and its associated blocks share a single `.ajson` file.
 *
 * This class orchestrates load/save/delete for the `smart_sources` collection, 
 * delegating per-item logic to `AjsonMultiFileSourceDataAdapter`.
 */
export class AjsonMultiFileSourcesDataAdapter extends AjsonMultiFileCollectionDataAdapter {
  ItemDataAdapter = AjsonMultiFileSourceDataAdapter;
}


/**
 * @class AjsonMultiFileSourceDataAdapter
 * @extends AjsonMultiFileItemDataAdapter
 * @description
 * Specialized adapter for a SmartSource `.ajson` file that contains the source and its blocks.
 *
 * On load, it determines final states of the source and its blocks, and can rewrite the file minimally.
 * On save, it now appends lines for the source (if needed) and all blocks that `_queue_save` at once.
 */
export class AjsonMultiFileSourceDataAdapter extends AjsonMultiFileItemDataAdapter {
}

export default {
  collection: AjsonMultiFileSourcesDataAdapter,
  item: AjsonMultiFileSourceDataAdapter
};
