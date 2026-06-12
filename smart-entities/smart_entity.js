// @ts-check

/**
 * @file smart_entity.js
 * @description Represents a single smart entity within a collection, now using the DefaultEntityVectorAdapter for vector operations.
 */

import { CollectionItem } from "smart-collections";
// import { sort_by_score } from "smart-utils/sort_by_score.js";
import { DefaultEntityVectorAdapter } from "./adapters/default.js";

/** @typedef {import('./smart_entities.js').SmartEntities} SmartEntities */
/** @typedef {import('smart-types').SmartEntitiesEnv} SmartEntitiesEnv */
/** @typedef {import('smart-types').SmartEntityData} SmartEntityData */
/** @typedef {import('smart-types').EntityEmbeddingRecord} EntityEmbeddingRecord */
/** @typedef {import('smart-types').EntityLastEmbed} EntityLastEmbed */
/** @typedef {import('smart-types').EntityConnectionResult} EntityConnectionResult */
/** @typedef {import('smart-types').CollectionItemRef} CollectionItemRef */
/** @typedef {SmartEntities & Object.<string, *> & {embed_model_key: string, embed_model: *, data_adapter: *}} SmartEntitiesInstance */
/** @typedef {SmartEntity & Object.<string, *> & {env: SmartEntitiesEnv, data: Object.<string, *>, collection: SmartEntitiesInstance, entity_adapter: DefaultEntityVectorAdapter, embed_model_key: string, embedding_data: EntityEmbeddingRecord & Object.<string, *>, last_embed: EntityLastEmbed & Object.<string, *>}} SmartEntityThis */

/**
 * @class SmartEntity
 * @extends CollectionItem
 * @classdesc Represents a single smart entity within a collection, handling embeddings and connections.
 */
export class SmartEntity extends CollectionItem {
  /**
   * Creates an instance of SmartEntity.
   * @constructor
   * @this {SmartEntityThis}
   * @param {SmartEntitiesEnv} env - The environment instance.
   * @param {Partial<SmartEntityData>} [opts={}] - Configuration options.
   */
  constructor(env, opts = {}) {
    super(env, opts);
  }

  /**
   * Adapter for this entity's vector operations.
   * @type {DefaultEntityVectorAdapter}
   */
  get entity_adapter() {
    if (!this._entity_adapter) {
      this._entity_adapter = new DefaultEntityVectorAdapter(this);
    }
    return this._entity_adapter;
  }

  set entity_adapter(entity_adapter) {
    this._entity_adapter = entity_adapter;
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

  /**
   * Initializes the SmartEntity instance.
   * Checks if the entity has a vector and if it matches the model dimensions.
   * If not, it queues an embed.
   * Removes embeddings for inactive models.
   * @this {SmartEntityThis}
   * @returns {void}
   */
  init() {
    super.init();
    if (!this.vec?.length){
      this.entity_adapter.vec = null;
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
   * @this {SmartEntityThis}
   * @returns {void}
   */
  queue_embed() {
    // this._queue_embed = true;
    this._queue_embed = this.should_embed;
  }

  /**
   * Prepares the input for embedding.
   * @async
   * @param {string|null} [content=null] - Optional content to use instead of calling subsequent read()
   * @returns {Promise<void>} Should be overridden in child classes.
   */
  async get_embed_input(content=null) { } // override in child class

  /**
   * Retrieves the embed input, either from cache or by generating it.
   * @readonly
   * @this {SmartEntityThis}
   * @returns {*} The embed input string or a promise resolving to it.
   */
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }

  /**
   * Finds connections relevant to this entity based on provided parameters.
   * @async
   * @this {SmartEntityThis}
   * @param {import('smart-types').FindConnectionsParams} [params={}] - Parameters for finding connections.
   * @deprecated should be in actions (getter) but also see ConnectionsLists (smart-lists) (2026-02-11)
   * @returns {Promise<Array<EntityConnectionResult>>} An array of result objects with score and item.
   */
  async find_connections(params = {}) {
    return await this.actions.find_connections(params);
  }

  /**
   * @this {SmartEntityThis}
   * @returns {string|null|undefined}
   */
  get read_hash() { return this.data.last_read?.hash; }
  /**
   * @this {SmartEntityThis}
   * @param {string|null} hash
   */
  set read_hash(hash) {
    if(!this.data.last_read) this.data.last_read = {};
    this.data.last_read.hash = hash;
  }
  /**
   * @this {SmartEntityThis}
   * @returns {EntityEmbeddingRecord}
   */
  get embedding_data() {
    if(!this.data.embeddings[this.embed_model_key]){
      this.data.embeddings[this.embed_model_key] = {};
    }
    return this.data.embeddings[this.embed_model_key];
  }
  /**
   * @this {SmartEntityThis}
   * @returns {EntityLastEmbed}
   */
  get last_embed() {
    if(!this.embedding_data.last_embed){
      this.embedding_data.last_embed = {};

      // // temporary for backwards compatibility (removed 2026-03-25)
      // if(this.data.last_embed){
      //   this.embedding_data.last_embed = this.data.last_embed;
      //   delete this.data.last_embed;
      //   this.queue_save();
      // }
    }
    return this.embedding_data.last_embed;
  }
  /**
   * @this {SmartEntityThis}
   * @returns {string|null|undefined}
   */
  get embed_hash() { return this.last_embed?.hash; }
  /**
   * @this {SmartEntityThis}
   * @param {string|null} hash
   */
  set embed_hash(hash) {
    if(!this.embedding_data.last_embed) this.embedding_data.last_embed = {};
    this.embedding_data.last_embed.hash = hash;
  }

  /**
   * Gets the embed link for the entity.
   * @readonly
   * @this {SmartEntityThis}
   * @returns {string} The embed link.
   */
  get embed_link() { return `![[${this.path}]]`; }

  /**
   * Gets the key of the embedding model.
   * @readonly
   * @this {SmartEntityThis}
   * @returns {string} The embedding model key.
   */
  get embed_model_key() { return this.collection.embed_model_key; }

  /**
   * Gets the embedding model instance from the collection.
   * @readonly
   * @this {SmartEntityThis}
   * @returns {*} The embedding model instance.
   */
  get embed_model() { return this.collection.embed_model; }

  /**
   * Determines if the entity should be embedded if unembedded. NOT the same as is_unembedded.
   * @readonly
   * @this {SmartEntityThis}
   * @returns {boolean} True if no vector is set, false otherwise.
   */
  get should_embed() { return this.size > (this.settings?.min_chars || 300); }

  /**
   * Sets the error for the embedding model.
   * @this {SmartEntityThis}
   * @param {string} error - The error message.
   */
  set error(error) { this.data.embeddings[this.embed_model_key].error = error; }

  /**
   * Gets the number of tokens associated with the entity's embedding.
   * @readonly
   * @this {SmartEntityThis}
   * @returns {number|undefined} The number of tokens, or undefined if not set.
   */
  get tokens() { return this.last_embed?.tokens; }
  /**
   * Sets the number of tokens for the embedding.
   * @this {SmartEntityThis}
   * @param {number} tokens - The number of tokens.
   */
  set tokens(tokens) {
    this.last_embed.tokens = tokens;
  }

  /**
   * Gets the vector representation from the entity adapter.
   * @readonly
   * @this {SmartEntityThis}
   * @returns {Array<number>|undefined} The vector or undefined if not set.
   */
  get vec() { return this.entity_adapter.vec; }

  /**
   * Sets the vector representation in the entity adapter.
   * @this {SmartEntityThis}
   * @param {Array<number>|null} vec - The vector to set.
   */
  set vec(vec) {
    this.entity_adapter.vec = vec;
    this._queue_embed = false;
    this._embed_input = null;
    this.queue_save();
  }

  /**
   * Removes all embeddings from the entity.
   * @this {SmartEntityThis}
   * @returns {void}
   */
  remove_embeddings() {
    this.data.embeddings = null;
    this.queue_save();
  }

  /**
   * Retrieves the key of the entity.
   * @this {SmartEntityThis}
   * @returns {*} The entity key.
   */
  get_key() { return this.data.key || this.data.path; }

  /**
   * Retrieves the path of the entity.
   * @readonly
   * @this {SmartEntityThis}
   * @returns {*} The entity path.
   */
  get path() { return this.data.path; }


  /**
   * @this {SmartEntityThis}
   * @returns {boolean}
   */
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

