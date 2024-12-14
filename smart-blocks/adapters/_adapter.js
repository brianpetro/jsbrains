import { create_hash } from "smart-sources/utils/create_hash.js";
/**
 * @file _adapter.js
 * @description Abstract base class for block-level adapters.
 */

/**
 * @class BlockContentAdapter
 * @classdesc Abstract base class that defines the interface for block-level CRUD operations.
 * Concrete implementations (like MarkdownBlockContentAdapter) must implement these methods.
 */
export class BlockContentAdapter {
  /**
   * @constructor
   * @param {Object} item - The SmartBlock instance this adapter operates on.
   */
  constructor(item) {
    /** @type {Object} */
    this.item = item;
  }

  /**
   * Read the content of the block.
   * @abstract
   * @async
   * @returns {Promise<string>} The content of the block.
   * @throws {Error} If not implemented by subclass.
   */
  async read() { throw new Error('Not implemented'); }

  /**
   * Append content to the block.
   * @abstract
   * @async
   * @param {string} content Content to append.
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async append(content) { throw new Error('Not implemented'); }

  /**
   * Update the block with new content.
   * @abstract
   * @async
   * @param {string} new_content New content for the block.
   * @param {Object} [opts={}] Additional options.
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async update(new_content, opts={}) { throw new Error('Not implemented'); }

  /**
   * Remove the block from the source.
   * @abstract
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async remove() { throw new Error('Not implemented'); }

  /**
   * Move the block to another location.
   * @abstract
   * @async
   * @param {string} to_key Destination path or entity reference.
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async move_to(to_key) { throw new Error('Not implemented'); }


  get data(){
    return this.item.data;
  }

  /**
   * Update the last read timestamp and hash of the block.
   * @async
   * @param {string} content The content of the block.
   * @returns {Promise<void>}
   */
  async update_last_read(content){
    this.data.last_read = {
      hash: await this.create_hash(content),
      at: Date.now(),
    };
  }

  /**
   * Create a hash of the block content.
   * @async
   * @param {string} content The content to hash.
   * @returns {Promise<string>} The hash of the content.
   */
  async create_hash(content) {
    return await create_hash(content);
  }
}
