/**
 * @file smart_entity.js
 * @description Represents a single smart entity within a collection, now using the DefaultEntityVectorAdapter for vector operations.
 */

import { CollectionItem } from "smart-collections";
// import { sort_by_score } from "smart-utils/sort_by_score.js";
import { DefaultEntityVectorAdapter } from "./adapters/default.js";

/**
 * @class SmartEntity
 * @extends CollectionItem
 * @classdesc Represents a single smart entity within a collection, handling embeddings and connections.
 */
export class SmartEntity extends CollectionItem {
  /**
   * Creates an instance of SmartEntity.
   * @constructor
   * @param {Object} env - The environment instance.
   * @param {Object} [opts={}] - Configuration options.
   */
  constructor(env, opts = {}) {
    super(env, opts);
    /** 
     * @type {DefaultEntityVectorAdapter} 
     * @deprecated use vector_adapter instead
     * @description Adapter for this entity's vector operations.
     */
    this.entity_adapter = new DefaultEntityVectorAdapter(this);
  }

  /**
   * Provides default values for a SmartEntity instance.
   * @static
   * @readonly
   * @returns {Object} The default values.
   */
  static get defaults() {
    return {
      data: {
        path: null,
        last_embed: {
          hash: null,
        },
        embeddings: {},
      },
    };
  }
  get vector_adapter() {
    if(!this._vector_adapter) {
      this._vector_adapter = new this.collection.opts.vector_adapter.item(this);
    }
    return this._vector_adapter;
  }

  /**
   * Initializes the SmartEntity instance.
   * Checks if the entity has a vector and if it matches the model dimensions.
   * If not, it queues an embed.
   * Removes embeddings for inactive models.
   * @returns {void}
   */
  init() {
    super.init();
    if (!this.vec || !this.vec.length){
      this.vec = null;
      this.queue_embed();
    }
    // Only keep active model embeddings
    Object.entries(this.data.embeddings || {}).forEach(([model, embedding]) => {
      if (model !== this.embed_model_key) {
        this.data.embeddings[model] = null;
        delete this.data.embeddings[model];
      }
    });
  }

  /**
   * Queues the entity for embedding.
   * @returns {void}
   */
  queue_embed() {
    this._queue_embed = true;
  }

  /**
   * Finds the nearest entities to this entity.
   * @param {Object} [filter={}] - Optional filters to apply.
   * @deprecated use actions (getter) instead
   * @returns {Array<{item:Object, score:number}>} An array of result objects with score and item.
   */
  async nearest(filter = {}) { return await this.collection.nearest_to(this, filter); }

  /**
   * Prepares the input for embedding.
   * @async
   * @param {string} [content=null] - Optional content to use instead of calling subsequent read()
   * @returns {Promise<void>} Should be overridden in child classes.
   */
  async get_embed_input(content=null) { } // override in child class

  /**
   * Retrieves the embed input, either from cache or by generating it.
   * @readonly
   * @returns {string|Promise<string>} The embed input string or a promise resolving to it.
   */
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }

  /**
   * Finds connections relevant to this entity based on provided parameters.
   * @async
   * @param {Object} [params={}] - Parameters for finding connections.
   * @deprecated should be in actions (getter) but also see ConnectionsLists (smart-lists)
   * @returns {Array<{item:Object, score:number}>} An array of result objects with score and item.
   */
  async find_connections(params = {}) {
    return await this.actions.find_connections(params);
  }

  /**
   * Retrieves connections from the cache based on the cache key.
   * @param {string} cache_key - The cache key.
   * @deprecated migrating to ConnectionsLists (smart-lists)
   * @returns {Array<{item:Object, score:number}>} The cached connections.
   */
  connections_from_cache(cache_key) {
    return this.env.connections_cache[cache_key];
  }

  /**
   * Stores connections in the cache with the provided cache key.
   * @param {string} cache_key - The cache key.
   * @deprecated migrating to ConnectionsLists (smart-lists)
   * @param {Array<{item:Object, score:number}>} connections - The connections to cache.
   * @returns {void}
   */
  connections_to_cache(cache_key, connections) {
    this.env.connections_cache[cache_key] = connections;
  }

  get read_hash() { return this.data.last_read?.hash; }
  set read_hash(hash) {
    if(!this.data.last_read) this.data.last_read = {};
    this.data.last_read.hash = hash;
  }
  get embedding_data() {
    if(!this.data.embeddings[this.embed_model_key]){
      this.data.embeddings[this.embed_model_key] = {};
    }
    return this.data.embeddings[this.embed_model_key];
  }
  get last_embed() {
    if(!this.embedding_data.last_embed){
      this.embedding_data.last_embed = {};

      // temporary for backwards compatibility
      if(this.data.last_embed){
        this.embedding_data.last_embed = this.data.last_embed;
        delete this.data.last_embed;
        this.queue_save();
      }
    }
    return this.embedding_data.last_embed;
  }
  get embed_hash() { return this.last_embed?.hash; }
  set embed_hash(hash) {
    if(!this.embedding_data.last_embed) this.embedding_data.last_embed = {};
    this.embedding_data.last_embed.hash = hash;
  }

  /**
   * Gets the embed link for the entity.
   * @readonly
   * @returns {string} The embed link.
   */
  get embed_link() { return `![[${this.path}]]`; }

  /**
   * Gets the key of the embedding model.
   * @readonly
   * @returns {string} The embedding model key.
   */
  get embed_model_key() { return this.collection.embed_model_key; }

  /**
   * Gets the embedding model instance from the collection.
   * @readonly
   * @returns {Object} The embedding model instance.
   */
  get embed_model() { return this.collection.embed_model; }

  /**
   * Determines if the entity should be embedded if unembedded. NOT the same as is_unembedded.
   * @readonly
   * @returns {boolean} True if no vector is set, false otherwise.
   */
  get should_embed() { return this.size > (this.settings?.min_chars || 300); }

  /**
   * Sets the error for the embedding model.
   * @param {string} error - The error message.
   */
  set error(error) { this.data.embeddings[this.embed_model_key].error = error; }

  /**
   * Gets the number of tokens associated with the entity's embedding.
   * @readonly
   * @returns {number|undefined} The number of tokens, or undefined if not set.
   */
  get tokens() { return this.last_embed?.tokens; }
  /**
   * Sets the number of tokens for the embedding.
   * @param {number} tokens - The number of tokens.
   */
  set tokens(tokens) {
    this.last_embed.tokens = tokens;
  }

  /**
   * Gets the vector representation from the entity adapter.
   * @readonly
   * @returns {Array<number>|undefined} The vector or undefined if not set.
   */
  get vec() { return this.entity_adapter.vec; }

  /**
   * Sets the vector representation in the entity adapter.
   * @param {Array<number>} vec - The vector to set.
   */
  set vec(vec) {
    this.entity_adapter.vec = vec;
    this._queue_embed = false;
    this._embed_input = null;
    this.queue_save();
  }

  /**
   * Removes all embeddings from the entity.
   * @returns {void}
   */
  remove_embeddings() {
    this.data.embeddings = null;
    this.queue_save();
  }

  /**
   * Retrieves the key of the entity.
   * @returns {string} The entity key.
   */
  get_key() { return this.data.key || this.data.path; }

  /**
   * Retrieves the path of the entity.
   * @readonly
   * @returns {string|null} The entity path.
   */
  get path() { return this.data.path; }


  get is_unembedded() {
    if(!this.vec) return true;
    if(!this.embed_hash || this.embed_hash !== this.read_hash) return true;
    return false;
  }

}

import { find_connections } from "./actions/find_connections.js";
export default {
  class: SmartEntity,
  actions: {
    find_connections: find_connections,
  },
}