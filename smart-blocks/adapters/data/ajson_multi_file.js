import { AjsonMultiFileCollectionDataAdapter, AjsonMultiFileItemDataAdapter } from 'smart-collections/adapters/ajson_multi_file.js';

/**
 * @class AjsonMultiFileSourcesDataAdapter
 * @extends AjsonMultiFileCollectionDataAdapter
 * @description
 * Collection-level adapter for handling multi-file AJSON storage of blocks and their children.
 * Each block and its associated children share a single `.ajson` file.
 *
 * This class orchestrates load/save/delete for the `smart_blocks` collection, 
 * delegating per-item logic to `AjsonMultiFileBlockDataAdapter`.
 */
export class AjsonMultiFileBlocksDataAdapter extends AjsonMultiFileCollectionDataAdapter {
  ItemDataAdapter = AjsonMultiFileBlockDataAdapter;
  /**
   * Transforms the item key into a safe filename.
   * Replaces spaces, slashes, and dots with underscores.
   * @returns {string} safe file name
   */
  // get_data_file_name(key) {
  //   return super.get_data_file_name(key.split('#')[0]);
  // }
  get_data_file_name(key) {
    return key.split('#')[0].replace(/[\s\/\.]/g, '_').replace(".md", "");
  }
  /**
   * Process any queued save operations.
   * @async
   * @returns {Promise<void>}
   */
  async process_save_queue() {
    this.collection.emit_event('collection:save_started');
    this.collection.show_process_notice('saving_collection');
    const save_queue = Object.values(this.collection.items).filter(item => item._queue_save);
    console.log(`Saving ${this.collection.collection_key}: ${save_queue.length} items`);
    const time_start = Date.now();

    const save_files = Object.entries(save_queue.reduce((acc, item) => {
      const file_name = this.get_item_data_path(item.key);
      acc[file_name] = acc[file_name] || [];
      acc[file_name].push(item);
      return acc;
    }, {}));
    for(let i = 0; i < save_files.length; i++) {
      const [file_name, items] = save_files[i];
      await this.fs.append(
        file_name,
        items.map(item => this.get_item_ajson(item)).join('\n') + '\n'
      );
      items.forEach(item => item._queue_save = false);
    }
    console.log(`Saved ${this.collection.collection_key} in ${Date.now() - time_start}ms`);
    this.collection.clear_process_notice('saving_collection');
    this.collection.emit_event('collection:save_completed');
  }
  process_load_queue(){
    // handled in sources
    console.log(`Skipping loading ${this.collection.collection_key}...`);
  }
}


/**
 * @class AjsonMultiFileBlockDataAdapter
 * @extends AjsonMultiFileItemDataAdapter
 * @description
 * Specialized adapter for a SmartBlock `.ajson` file that contains the block and its children.
 *
 * On load, it determines final states of the block and its children, and can rewrite the file minimally.
 * On save, it now appends lines for the source (if needed) and all blocks that `_queue_save` at once.
 */
export class AjsonMultiFileBlockDataAdapter extends AjsonMultiFileItemDataAdapter {

}

export default {
  collection: AjsonMultiFileBlocksDataAdapter,
  item: AjsonMultiFileBlockDataAdapter
};

