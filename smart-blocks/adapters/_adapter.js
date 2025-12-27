import { create_hash, murmur_hash_32_alphanumeric } from "smart-utils/create_hash.js";
/**
 * @file _adapter.js
 * @description Abstract base class for block-level adapters.
 */

/**
 * @class BlockContentAdapter
 * @classdesc 
 * Abstract base class defining CRUD operations for a single block’s content.  
 * Concrete adapters (e.g., `MarkdownBlockContentAdapter`) must implement these methods 
 * to perform actual read/update/remove operations at the block level.
 *
 * **Intended Usage**:  
 * - Extend this class for different file formats or content types.  
 * - Implement all abstract methods to handle block-level changes in the source file.
 */
export class BlockContentAdapter {
  /**
   * @constructor
   * @param {Object} item - The SmartBlock instance this adapter operates on.
   * The `item` should at least provide `data` and references to its parent source.
   */
  constructor(item) {
    /**
     * @type {Object}
     * @description The SmartBlock instance handled by this adapter.
     */
    this.item = item;
  }

  /**
   * @async
   * @method read
   * @abstract
   * @returns {Promise<string>} The content of the block.
   * @throws {Error} If not implemented by subclass.
   */
  async read() { throw new Error('Not implemented'); }

  /**
   * @async
   * @method append
   * @abstract
   * @param {string} content Content to append to the block.
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async append(content) { throw new Error('Not implemented'); }

  /**
   * @async
   * @method update
   * @abstract
   * @param {string} new_content The new content for the block.
   * @param {Object} [opts={}] Additional update options.
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async update(new_content, opts={}) { throw new Error('Not implemented'); }

  /**
   * @async
   * @method remove
   * @abstract
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async remove() { throw new Error('Not implemented'); }

  /**
   * @async
   * @method move_to
   * @abstract
   * @param {string} to_key The destination key (source or block reference).
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async move_to(to_key) { throw new Error('Not implemented'); }

  /**
   * @method get_display_name
   * @abstract
   * @param {Object} params Parameters for display name generation.
   * @returns {string} The display name of the block.
   * @throws {Error} If not implemented by subclass.
   */
  get_display_name(params) { throw new Error('Not implemented'); }

  /**
   * @name data
   * @type {Object}
   * @readonly
   * @description Access the block’s data object. Useful for updating metadata like line references or hashes.
   */
  get data(){
    return this.item.data;
  }

  /**
   * @async
   * @method update_last_read
   * @param {string} content The current content of the block.
   * @returns {Promise<void>}
   * @description Update the block’s `last_read` hash and timestamp based on the given content.
   */
  async update_last_read(content){
    this.data.last_read = {
      hash: this.create_hash(content),
      at: Date.now(),
    };
  }

  /**
   * @method create_hash
   * @param {string} content The content to hash.
   * @returns {Promise<string>} The computed hash of the content.
   * @description Hash the block content to detect changes and prevent unnecessary re-embeddings.
   */
  create_hash(content) {
    // return await create_hash(content);
    return murmur_hash_32_alphanumeric(content);
  }
}

export default {
  collection: null, // No collection adapter for this base file
  item: BlockContentAdapter
};