/**
 * @file _adapter.js
 * @description Defines the EntityVectorAdapter class, serving as a base adapter for managing vector embeddings
 * within SmartEntity instances. This default adapter stores embeddings directly in the entity's internal data object.
 *
 * Future adapters can extend this base class to persist or retrieve vector embeddings from external sources
 * (e.g., local file storage, databases, or cloud-based vector stores / vector search APIs).
 */

/**
 * @class EntityVectorAdapter
 * @classdesc A base adapter for handling vector embeddings of a SmartEntity instance. By default, this adapter
 * interacts with the SmartEntity's internal data object to get and set embeddings. Future implementations
 * can override the `get vec` and `set vec` accessors to interface with external storage solutions.
 */
export class EntityVectorAdapter {
  /**
   * Creates an instance of EntityVectorAdapter.
   * @constructor
   * @param {Object} item - The SmartEntity instance this adapter manages.
   * @example
   * const adapter = new EntityVectorAdapter(mySmartEntity);
   */
  constructor(item) {
    /** 
     * @type {Object} 
     * @private
     * @description The SmartEntity instance this adapter is wrapping.
     */
    this.item = item;
  }

  /**
   * Retrieves the full data object of the associated SmartEntity. This data object typically contains
   * metadata, embeddings, and other entity-related information.
   * @readonly
   * @type {Object}
   * @example
   * const data = adapter.data;
   */
  get data() {
    return this.item.data;
  }

  /**
   * Retrieves the key identifying which embedding model is currently in use. This key is used to
   * access the correct embedding vector from the data object.
   * @readonly
   * @type {string|undefined}
   * @example
   * const modelKey = adapter.embed_model_key;
   */
  get embed_model_key() {
    return this.item.embed_model?.model_key;
  }

  /**
   * Retrieves the vector representation (the embedding) associated with the current embedding model.
   * 
   * By default, this adapter stores embeddings directly in `this.smart_entity.data.embeddings`,
   * keyed by the embedding model's key. If no vector is found, `undefined` is returned.
   *
   * Future adapters could override this getter to retrieve the vector from external sources, such as:
   * - Local disk storage (e.g., reading from a local file or database).
   * - Cloud-based vector databases or APIs.
   * - Custom caching layers for faster access.
   *
   * @readonly
   * @type {Array<number>|undefined}
   * @example
   * const vector = adapter.vec; // [0.23, 0.01, ...] or undefined if not set
   */
  get vec() {
    return this.data?.embeddings?.[this.embed_model_key]?.vec;
  }

  /**
   * Sets the vector representation (the embedding) for the current embedding model. If the embeddings
   * data structure does not exist, it is initialized. This default implementation persists the vector
   * in the SmartEntity's internal data object.
   * 
   * Future adapters could override this setter to store the vector in external systems, for example:
   * - Writing to a local database for persistence.
   * - Sending the vector to a remote vector database or search index.
   * - Implementing custom storage strategies (e.g., sharding, caching).
   *
   * @param {Array<number>} vec - The embedding vector.
   * @example
   * adapter.vec = [0.23, 0.01, 0.76, ...];
   */
  set vec(vec) {
    if (!this.data.embeddings) {
      this.data.embeddings = {};
    }
    if (!this.data.embeddings[this.embed_model_key]) {
      this.data.embeddings[this.embed_model_key] = {};
    }
    this.data.embeddings[this.embed_model_key].vec = vec;
  }
}
