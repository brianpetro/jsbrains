/**
 * @file EntitiesVectorAdapter and EntityVectorAdapter base classes
 * @description
 * Provides an abstract base interface for vector operations on collections (EntitiesVectorAdapter)
 * and single entities (EntityVectorAdapter).
 *
 * Subclasses should override and implement their logic for storing and retrieving vectors,
 * calculating nearest/furthest results, embedding batches, etc.
 *
 * All methods throw by default, serving as an interface until implemented by concrete adapters.
 */

/**
 * @class EntitiesVectorAdapter
 * @classdesc
 * Abstract base class for handling vector operations at the collection level.
 * Responsible for batch embedding, finding nearest/furthest items, and processing embed queues.
 * 
 * @example
 * class MyEntitiesVectorAdapter extends EntitiesVectorAdapter {
 *   async nearest(vec, filter = {}) {
 *     // implement logic for finding nearest entities based on `vec`
 *   }
 *   async embed_batch(entities) {
 *     // implement logic for embedding a batch of entities
 *   }
 * }
 */
export class EntitiesVectorAdapter {
  /**
   * @constructor
   * @param {Object} collection - The collection (SmartEntities or derived class) instance.
   */
  constructor(collection) {
    /**
     * @type {Object}
     * @description Reference to the SmartEntities collection instance.
     */
    this.collection = collection;
  }

  /**
   * Find the nearest entities to the given vector.
   * @async
   * @param {number[]} vec - The reference vector.
   * @param {Object} [filter={}] - Optional filters (limit, exclude, etc.)
   * @returns {Promise<Array<{item:Object, score:number}>>} Array of results sorted by score descending.
   * @abstract
   * @throws {Error} Not implemented by default.
   */
  async nearest(vec, filter = {}) {
    throw new Error('EntitiesVectorAdapter.nearest() not implemented');
  }

  /**
   * Find the furthest entities from the given vector.
   * @async
   * @param {number[]} vec - The reference vector.
   * @param {Object} [filter={}] - Optional filters (limit, exclude, etc.)
   * @returns {Promise<Array<{item:Object, score:number}>>} Array of results sorted by score ascending (furthest).
   * @abstract
   * @throws {Error} Not implemented by default.
   */
  async furthest(vec, filter = {}) {
    throw new Error('EntitiesVectorAdapter.furthest() not implemented');
  }

  /**
   * Embed a batch of entities.
   * @async
   * @param {Object[]} entities - Array of entity instances to embed.
   * @returns {Promise<void>}
   * @abstract
   * @throws {Error} Not implemented by default.
   */
  async embed_batch(entities) {
    throw new Error('EntitiesVectorAdapter.embed_batch() not implemented');
  }

  /**
   * Process a queue of entities waiting to be embedded.
   * Typically, this will call embed_batch in batches and update entities.
   * @async
   * @param {Object[]} embed_queue - Array of entities to embed.
   * @returns {Promise<void>}
   * @abstract
   * @throws {Error} Not implemented by default.
   */
  async process_embed_queue(embed_queue) {
    throw new Error('EntitiesVectorAdapter.process_embed_queue() not implemented');
  }
}

/**
 * @class EntityVectorAdapter
 * @classdesc
 * Abstract base class for handling vector operations for a single entity.
 * Responsible for getting/setting/deleting the vector and potentially interacting with external stores.
 *
 * @example
 * class MyEntityVectorAdapter extends EntityVectorAdapter {
 *   async get_vec() {
 *     // Return vector from external store or item.data
 *   }
 *   async set_vec(vec) {
 *     // Store vector in external system
 *   }
 * }
 */
export class EntityVectorAdapter {
  /**
   * @constructor
   * @param {Object} item - The SmartEntity instance that this adapter is associated with.
   */
  constructor(item) {
    /**
     * @type {Object}
     * @description The SmartEntity instance this adapter manages.
     */
    this.item = item;
  }

  /**
   * Retrieve the current vector embedding for this entity.
   * @async
   * @returns {Promise<number[]|undefined>} The entity's vector or undefined if not set.
   * @abstract
   * @throws {Error} Not implemented by default.
   */
  async get_vec() {
    throw new Error('EntityVectorAdapter.get_vec() not implemented');
  }

  /**
   * Store/update the vector embedding for this entity.
   * @async
   * @param {number[]} vec - The vector to set.
   * @returns {Promise<void>}
   * @abstract
   * @throws {Error} Not implemented by default.
   */
  async set_vec(vec) {
    throw new Error('EntityVectorAdapter.set_vec() not implemented');
  }

  /**
   * Delete/remove the vector embedding for this entity.
   * @async
   * @returns {Promise<void>}
   * @abstract
   * @throws {Error} Not implemented by default.
   */
  async delete_vec() {
    throw new Error('EntityVectorAdapter.delete_vec() not implemented');
  }
}

export default {
  collection: EntitiesVectorAdapter,
  item: EntityVectorAdapter
};