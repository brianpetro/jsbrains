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
  async block_read() { throw new Error('Not implemented'); }

  /**
   * Append content to the block.
   * @abstract
   * @async
   * @param {string} content Content to append.
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async block_append(content) { throw new Error('Not implemented'); }

  /**
   * Update the block with new content.
   * @abstract
   * @async
   * @param {string} new_block_content New content for the block.
   * @param {Object} [opts={}] Additional options.
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async block_update(new_block_content, opts={}) { throw new Error('Not implemented'); }

  /**
   * Remove the block from the source.
   * @abstract
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async block_remove() { throw new Error('Not implemented'); }

  /**
   * Move the block to another location.
   * @abstract
   * @async
   * @param {string} to_key Destination path or entity reference.
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass.
   */
  async block_move_to(to_key) { throw new Error('Not implemented'); }
}
