import { CollectionItem } from "smart-collections";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";
import { EntityVectorAdapter } from "smart-entities/adapters/_adapter.js";
import { render as render_entity_component } from "./components/entity.js";

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
    /** @type {EntityVectorAdapter} */
    this.entity_adapter = new EntityVectorAdapter(this);
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
        embeddings: {}, // contains keys per model
        last_embed: {
          hash: null,
        },
      },
    };
  }

  /**
   * Initializes the SmartEntity instance.
   * @returns {void}
   */
  init() {
    super.init();
    if (!this.vec) {
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
   * @returns {Array<Result>} An array of result objects with score and item.
   */
  nearest(filter = {}) { return this.collection.nearest_to(this, filter); }

  /**
   * Prepares the input for embedding.
   * @async
   * @param {string} [content=null] - Optional content to use instead calling subsequent read()
   * @returns {Promise<void>} Should be overridden in child classes.
   */
  async get_embed_input(content=null) { } // override in child class

  /**
   * Prepares filter options for finding connections based on parameters.
   * @param {Object} [params={}] - Parameters for finding connections.
   * @returns {Object} The prepared filter options.
   */
  prepare_find_connections_filter_opts(params = {}) {
    const opts = {
      ...(this.env.settings.smart_view_filter || {}),
      ...params,
      entity: this,
    };
    if (opts.filter?.limit) delete opts.filter.limit; // remove to prevent limiting in initial filter
    if (opts.limit) delete opts.limit; // backwards compatibility
    return opts;
  }

  /**
   * Finds connections relevant to this entity based on provided parameters.
   * @param {Object} [params={}] - Parameters for finding connections.
   * @returns {Array<Result>} An array of result objects with score and item.
   */
  find_connections(params = {}) {
    const filter_opts = this.prepare_find_connections_filter_opts(params);
    const limit = params.filter?.limit
      || params.limit // DEPRECATED: for backwards compatibility
      || this.env.settings.smart_view_filter?.results_limit
      || 10;
    const cache_key = this.key + JSON.stringify(params); // no objects/instances in cache key
    if (!this.env.connections_cache) this.env.connections_cache = {};
    if (!this.env.connections_cache[cache_key]) {
      const connections = this.nearest(filter_opts)
        .sort(sort_by_score)
        .slice(0, limit);
      this.connections_to_cache(cache_key, connections);
    }
    return this.connections_from_cache(cache_key);
  }

  /**
   * Retrieves connections from the cache based on the cache key.
   * @param {string} cache_key - The cache key.
   * @returns {Array<Result>} The cached connections.
   */
  connections_from_cache(cache_key) {
    return this.env.connections_cache[cache_key];
  }

  /**
   * Stores connections in the cache with the provided cache key.
   * @param {string} cache_key - The cache key.
   * @param {Array<Result>} connections - The connections to cache.
   * @returns {void}
   */
  connections_to_cache(cache_key, connections) {
    this.env.connections_cache[cache_key] = connections;
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
   * Gets the name of the entity, formatted based on settings.
   * @readonly
   * @returns {string} The entity name.
   */
  get name() { return (!this.should_show_full_path ? this.path.split("/").pop() : this.path.split("/").join(" > ")).split("#").join(" > ").replace(".md", ""); }

  /**
   * Determines whether to show the full path of the entity.
   * @readonly
   * @returns {boolean} True if the full path should be shown, false otherwise.
   */
  get should_show_full_path() { return this.env.settings.smart_view_filter?.show_full_path; }

  /**
   * @deprecated Use embed_model instead.
   * @readonly
   * @returns {Object} The smart embedding model.
   */
  get smart_embed() { return this.embed_model; }

  /**
   * Gets the embedding model instance from the collection.
   * @readonly
   * @returns {Object} The embedding model instance.
   */
  get embed_model() { return this.collection.embed_model; }

  /**
   * Gets the number of tokens associated with the entity's embedding.
   * @readonly
   * @returns {number|undefined} The number of tokens, or undefined if not set.
   */
  get tokens() { return this.data.embeddings[this.embed_model_key]?.tokens; }

  /**
   * Determines if the entity is unembedded based on vector presence and size.
   * @readonly
   * @returns {boolean} True if unembedded, false otherwise.
   */
  get is_unembedded() {
    if (this.vec) return false;
    if (this.size < (this.settings?.min_chars || 300)) return false; // ignore small files
    return true;
  }

  /**
   * Determines if the entity should be embedded.
   * @readonly
   * @returns {boolean} Always returns true. Can be overridden in child classes.
   */
  get should_embed() { return true; } // may override in child class

  /**
   * Sets the error for the embedding model.
   * @param {string} error - The error message.
   */
  set error(error) { this.data.embeddings[this.embed_model_key].error = error; }

  /**
   * Sets the number of tokens for the embedding.
   * @param {number} tokens - The number of tokens.
   */
  set tokens(tokens) {
    if (!this.data.embeddings) this.data.embeddings = {};
    if (!this.data.embeddings[this.embed_model_key]) this.data.embeddings[this.embed_model_key] = {};
    this.data.embeddings[this.embed_model_key].tokens = tokens;
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

  /**
   * Gets the component responsible for rendering the entity.
   * @readonly
   * @returns {Function} The render function for the entity component.
   */
  get component() { return render_entity_component; }

  // COMPONENTS 2024-11-27
  get connections_component() {
    if(!this._connections_component) this._connections_component = this.components?.connections?.bind(this.smart_view);
    return this._connections_component;
  }
  async render_connections(container, opts={}) {
    if(container) container.innerHTML = 'Loading connections...';
    const frag = await this.env.render_component('connections', this, opts);
    if(container) {
      container.innerHTML = '';
      container.appendChild(frag);
    }
    return frag;
  }
}
