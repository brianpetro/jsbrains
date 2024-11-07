/**
 * @class EntityAdapter
 * @classdesc Adapts the SmartEntity class to manage embedding data.
 */
export class EntityAdapter {
  /**
   * Creates an instance of EntityAdapter.
   * @constructor
   * @param {Object} smart_entity - The SmartEntity instance that this adapter is wrapping.
   */
  constructor(smart_entity) {
    /** @type {Object} The SmartEntity instance */
    this.smart_entity = smart_entity;
  }

  /**
   * Retrieves the data object of the smart entity.
   * @readonly
   * @returns {Object} The data object containing embeddings and other entity data.
   */
  get data() { return this.smart_entity.data; }

  /**
   * Retrieves the embedding model key used for this entity.
   * @readonly
   * @returns {string} The key for the embedding model.
   */
  get embed_model_key() { return this.smart_entity.embed_model_key; }

  /**
   * Retrieves the vector representation for this entity's embedding.
   * @readonly
   * @returns {Array<number>|undefined} The vector array if available, or undefined if not set.
   */
  get vec() {
    return this.data?.embeddings?.[this.embed_model_key]?.vec;
  }

  /**
   * Sets the vector representation for this entity's embedding.
   * Initializes the embeddings data structure if not already present.
   * @param {Array<number>} vec - The vector array to set for this embedding.
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