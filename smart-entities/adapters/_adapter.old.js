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
 * @classdesc 
 * A base adapter for handling vector embeddings of a SmartEntity instance.  
 * This adapter defines a standard interface to get and set vector embeddings 
 * associated with a particular embedding model. By default, embeddings are stored 
 * inside the item's internal `data` object.  
 * 
 * **Intended Usage**:  
 * - Extend this class to integrate with external vector storage systems (files, databases, APIs).  
 * - Override `get vec()` and `set vec()` accessors to interact with your chosen storage layer.
 * 
 * **Example**:
 * ```js
 * class MyExternalVectorAdapter extends EntityVectorAdapter {
 *   get vec() {
 *     // Fetch vector from external DB
 *   }
 *   set vec(val) {
 *     // Save vector to external DB
 *   }
 * }
 * ```
 */
export class EntityVectorAdapter {
  /**
   * @constructor
   * @param {Object} item - The SmartEntity instance this adapter manages. 
   * The `item` should have `data` property, `embed_model` property, and 
   * potentially `data.embeddings` object for storing embeddings.
   */
  constructor(item) {
    /** 
     * @type {Object}
     * @description The SmartEntity instance this adapter is associated with.
     */
    this.item = item;
  }

  /**
   * @name data
   * @type {Object}
   * @readonly
   * @description 
   * Access the SmartEntity's internal data object. This typically includes `embeddings`
   * keyed by the embedding model’s unique identifier.
   */
  get data() {
    return this.item.data;
  }

  /**
   * @name embed_model_key
   * @type {string|undefined}
   * @readonly
   * @description 
   * The unique key identifying the currently active embedding model for this entity.
   * Returns `undefined` if no embedding model is associated.
   */
  get embed_model_key() {
    return this.item.embed_model?.model_key;
  }

  /**
   * @name vec
   * @type {Array<number>|undefined}
   * @description 
   * Retrieve the vector embedding associated with the current embedding model from 
   * the entity’s data. If no vector or model is set, returns `undefined`.  
   * 
   * Override this getter to integrate with external vector stores.
   */
  get vec() {
    return this.data?.embeddings?.[this.embed_model_key]?.vec;
  }

  /**
   * @name vec
   * @param {Array<number>} vec
   * @description 
   * Store the vector embedding for the current model in the entity’s data.  
   * Override this setter to write embeddings to external storage.
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