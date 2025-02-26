/**
 * @file smart_entities.js
 * @description Manages a collection of smart entities with embedding capabilities.
 * Delegates vector operations (nearest, furthest, embedding) to the assigned vector adapter (DefaultEntitiesVectorAdapter).
 */

import { Collection } from "smart-collections";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";
import { DefaultEntitiesVectorAdapter } from "./adapters/default.js";

/**
 * @class SmartEntities
 * @extends Collection
 * @classdesc Manages a collection of smart entities with embedding capabilities.
 */
export class SmartEntities extends Collection {
  /**
   * Creates an instance of SmartEntities.
   * @constructor
   * @param {Object} env - The environment instance.
   * @param {Object} opts - Configuration options.
   */
  constructor(env, opts) {
    super(env, opts);
    /**
     * @type {DefaultEntitiesVectorAdapter}
     * @description Adapter that handles vector operations (nearest/furthest/embedding) for this collection.
     */
    this.entities_vector_adapter = new DefaultEntitiesVectorAdapter(this);

    /** @type {string|null} */
    this.model_instance_id = null;
    /** @type {Array<Object>} */
    this._embed_queue = [];
  }

  /**
   * Initializes the SmartEntities instance by loading embeddings.
   * @async
   * @returns {Promise<void>}
   */
  async init() {
    await super.init();
    await this.load_smart_embed();
    if (!this.embed_model) {
      console.log(`SmartEmbed not loaded for **${this.collection_key}**. Continuing without embedding capabilities.`);
    }
  }

  /**
   * Loads the smart embedding model.
   * @async
   * @returns {Promise<void>}
   */
  async load_smart_embed() {
    if (this.embed_model_key === 'None') return;
    if (!this.embed_model) return;
    if (this.embed_model.is_loading) return console.log(`SmartEmbedModel already loading for ${this.embed_model_key}`);
    if (this.embed_model.is_loaded) return console.log(`SmartEmbedModel already loaded for ${this.embed_model_key}`);
    try {
      console.log(`Loading SmartEmbedModel in ${this.collection_key}, current state: ${this.embed_model.state}`);
      await this.embed_model.load();
    } catch (e) {
      // catch error to ensure collection settings still load
      console.error(`Error loading SmartEmbedModel for ${this.embed_model.model_key}`);
      console.error(e);
    }
  }

  /**
   * Unloads the smart embedding model.
   * @async
   * @returns {Promise<void>}
   */
  async unload() {
    if (typeof this.embed_model?.unload === 'function') {
      this.embed_model.unload();
      this.embed_model = null; // triggers new instance on next access
    }
    super.unload();
  }

  /**
   * Gets the key of the embedding model.
   * @readonly
   * @returns {string} The embedding model key.
   */
  get embed_model_key() {
    return this.embed_model?.model_key;
  }

  /**
   * Gets or creates the container for smart embeddings in the DOM.
   * @readonly
   * @returns {HTMLElement|undefined} The container element or undefined if not available.
   */
  get smart_embed_container() {
    if (!this.model_instance_id) return console.log('model_key not set');
    const id = this.model_instance_id.replace(/[^a-zA-Z0-9]/g, '_');
    if (!window.document) return console.log('window.document not available');
    if (window.document.querySelector(`#${id}`)) return window.document.querySelector(`#${id}`);
    const container = window.document.createElement('div');
    container.id = id;
    window.document.body.appendChild(container);
    return container;
  }

  /**
   * @deprecated Use embed_model instead.
   * @readonly
   * @returns {Object} The smart embedding model.
   */
  get smart_embed() { return this.embed_model; }

  /**
   * Gets the embedding model instance.
   * @readonly
   * @returns {Object|null} The embedding model instance or null if none.
   */
  get embed_model() {
    if (!this.env._embed_model && this.env.opts.modules.smart_embed_model?.class) this.env._embed_model = new this.env.opts.modules.smart_embed_model.class({
      settings: this.settings.embed_model,
      adapters: this.env.opts.modules.smart_embed_model?.adapters,
      re_render_settings: this.re_render_settings.bind(this),
      reload_model: this.reload_embed_model.bind(this),
    });
    return this.env._embed_model;
  }
  set embed_model(embed_model) { this.env._embed_model = embed_model; }
  reload_embed_model() {
    console.log("reload_embed_model");
    this.embed_model.unload();
    this.env._embed_model = null;
  }
  re_render_settings() {
    this.settings_container.innerHTML = '';
    this.render_settings();
  }

  /**
   * Finds the nearest entities to a given entity.
   * @async
   * @param {Object} entity - The reference entity.
   * @param {Object} [filter={}] - Optional filters to apply.
   * @returns {Promise<Array<{item:Object, score:number}>>} An array of result objects with score and item.
   */
  async nearest_to(entity, filter = {}) { return await this.nearest(entity.vec, filter); }

  /**
   * Finds the nearest entities to a vector using the default adapter.
   * @async
   * @param {Array<number>} vec - The vector to compare against.
   * @param {Object} [filter={}] - Optional filters to apply.
   * @returns {Promise<Array<{item:Object, score:number}>>} An array of result objects with score and item.
   */
  async nearest(vec, filter = {}) {
    if (!vec) {
      console.warn("nearest: no vec");
      return [];
    }
    return await this.entities_vector_adapter.nearest(vec, filter);
  }


  /**
   * Finds the furthest entities from a vector using the default adapter.
   * @async
   * @param {Array<number>} vec - The vector to compare against.
   * @param {Object} [filter={}] - Optional filters to apply.
   * @returns {Promise<Array<{item:Object, score:number}>>} An array of result objects with score and item.
   */
  async furthest(vec, filter = {}) {
    if (!vec) return console.warn("furthest: no vec");
    return await this.entities_vector_adapter.furthest(vec, filter);
  }

  /**
   * Gets the file name based on collection key and embedding model key.
   * @readonly
   * @returns {string} The constructed file name.
   */
  get file_name() { return this.collection_key + '-' + this.embed_model_key.split("/").pop(); }

  /**
   * Calculates the relevance of an item based on the search filter.
   * @param {Object} item - The item to calculate relevance for.
   * @param {Object} search_filter - The search filter containing keywords.
   * @returns {number} The relevance score:
   *                   1 if any keyword is found in the item's path,
   *                   0 otherwise (default relevance for keyword in content).
   */
  calculate_relevance(item, search_filter) {
    // if keyword in search_filter is in item.path, return 1
    if(search_filter.keywords.some(keyword => item.path?.includes(keyword))) return 1;
    return 0; // default relevance (keyword in content)
  }

  /**
   * Prepares the filter options by incorporating entity-based filters.
   * @param {Object} [opts={}] - The filter options.
   * @param {Object} [opts.entity] - The entity to base the filters on.
   * @param {string|string[]} [opts.exclude_filter] - Keys or prefixes to exclude.
   * @param {string|string[]} [opts.include_filter] - Keys or prefixes to include.
   * @param {boolean} [opts.exclude_inlinks] - Whether to exclude inlinks of the entity.
   * @param {boolean} [opts.exclude_outlinks] - Whether to exclude outlinks of the entity.
   * @returns {Object} The modified filter options.
   */
  prepare_filter(opts = {}) {
    const {
      entity,
      exclude_filter,
      include_filter,
      exclude_inlinks,
      exclude_outlinks,
    } = opts;

    if (entity) {
      if (typeof opts.exclude_key_starts_with_any === 'undefined') opts.exclude_key_starts_with_any = [];
      if (opts.exclude_key_starts_with) {
        opts.exclude_key_starts_with_any = [
          opts.exclude_key_starts_with,
        ];
        delete opts.exclude_key_starts_with;
      }
      opts.exclude_key_starts_with_any.push((entity.source_key || entity.key)); // exclude current entity
      // include/exclude filters
      if (exclude_filter) {
        // if (typeof exclude_filter === "string") opts.exclude_key_starts_with_any.push(exclude_filter);
        // else if (Array.isArray(exclude_filter)) opts.exclude_key_starts_with_any.push(...exclude_filter);
        if (!Array.isArray(opts.exclude_key_includes_any)) opts.exclude_key_includes_any = [];
        if (typeof exclude_filter === "string") opts.exclude_key_includes_any.push(exclude_filter);
        else if (exclude_filter.includes(",")) opts.exclude_key_includes_any.push(...exclude_filter.split(","));
      }
      if (include_filter) {
        // if (!Array.isArray(opts.key_starts_with_any)) opts.key_starts_with_any = [];
        // if (typeof include_filter === "string") opts.key_starts_with_any.push(include_filter);
        // else if (Array.isArray(include_filter)) opts.key_starts_with_any.push(...include_filter);
        if (!Array.isArray(opts.key_includes_any)) opts.key_includes_any = [];
        if (typeof include_filter === "string") opts.key_includes_any.push(include_filter);
        else if (include_filter.includes(",")) opts.key_includes_any.push(...include_filter.split(","));
      }
      // exclude inlinks
      if (exclude_inlinks && entity?.inlinks?.length) {
        if (!Array.isArray(opts.exclude_key_starts_with_any)) opts.exclude_key_starts_with_any = [];
        opts.exclude_key_starts_with_any.push(...entity.inlinks);
      }
      // exclude outlinks
      if (exclude_outlinks && entity?.outlinks?.length) {
        if (!Array.isArray(opts.exclude_key_starts_with_any)) opts.exclude_key_starts_with_any = [];
        opts.exclude_key_starts_with_any.push(...entity.outlinks);
      }
    }
    return opts;
  }

  /**
   * Looks up entities based on hypothetical content.
   * @async
   * @param {Object} [params={}] - The parameters for the lookup.
   * @param {Array<string>} [params.hypotheticals=[]] - The hypothetical content to lookup.
   * @param {Object} [params.filter] - The filter to use for the lookup.
   * @param {number} [params.k] - Deprecated: Use `filter.limit` instead.
   * @returns {Promise<Array<Result>|Object>} The lookup results or an error object.
   */
  async lookup(params = {}) {
    const { hypotheticals = [] } = params;
    if (!hypotheticals?.length) return { error: "hypotheticals is required" };
    if (!this.embed_model) return { error: "Embedding search is not enabled." };
    const hyp_vecs = await this.embed_model.embed_batch(hypotheticals.map(h => ({ embed_input: h })));
    const limit = params.filter?.limit
      || params.k // DEPRECATED: for backwards compatibility
      || this.env.settings.lookup_k
      || 10
    ;
    if(params.filter?.limit) delete params.filter.limit; // remove to prevent limiting in initial filter (limit should happen after nearest for lookup)
    const filter = {
      ...(this.env.chats?.current?.scope || {}),
      ...(params.filter || {}),
    };
    const results = await hyp_vecs.reduce(async (acc_promise, embedding, i) => {
      const acc = await acc_promise;
      const results = await this.nearest(embedding.vec, filter);
      results.forEach(result => {
        if (!acc[result.item.path] || result.score > acc[result.item.path].score) {
          acc[result.item.path] = {
            key: result.item.key,
            score: result.score,
            item: result.item,
            hypothetical_i: i,
          };
        } else {
          // DEPRECATED: Handling when last score added to entity is not top score
          result.score = acc[result.item.path].score;
        }
      });
      return acc;
    }, Promise.resolve({}));

    console.log(results);
    const top_k = Object.values(results)
      .sort(sort_by_score)
      .slice(0, limit)
    ;
    // DO: decided how to re-implement these functions
    // console.log("nearest before std dev slice", top_k.length);
    // top_k = get_nearest_until_next_dev_exceeds_std_dev(top_k); // tested
    // console.log("nearest after std dev slice", top_k.length);
    // top_k = sort_by_len_adjusted_similarity(top_k); // tested
    // console.log(top_k);
    console.log(`Found and returned ${top_k.length} ${this.collection_key}.`);
    return top_k;
  }

  /**
   * Gets the configuration for settings.
   * @readonly
   * @returns {Object} The settings configuration.
   */
  get settings_config() {
    return settings_config;
  }
  async render_settings(container=this.settings_container, opts = {}) {
    container = await this.render_collection_settings(container, opts);
    const embed_model_settings_frag = await this.env.render_component('settings', this.embed_model, opts);
    container.appendChild(embed_model_settings_frag);
    return container;
  }

  /**
   * Gets the notices from the environment.
   * @readonly
   * @returns {Object} The notices object.
   */
  get notices() { return this.env.smart_connections_plugin?.notices || this.env.main?.notices; }

  /**
   * Gets the embed queue containing items to be embedded.
   * @readonly
   * @returns {Array<Object>} The embed queue.
   */
  get embed_queue() {
    if(!this._embed_queue?.length) this._embed_queue = Object.values(this.items).filter(item => item._queue_embed && item.should_embed);
    return this._embed_queue;
  }

  /**
   * Processes the embed queue by delegating to the default vector adapter.
   * @async
   * @returns {Promise<void>}
   */
  async process_embed_queue() {
    await this.entities_vector_adapter.process_embed_queue();
  }


  /**
   * Handles changes to the embedding model by reinitializing and processing the load queue.
   * @async
   * @returns {Promise<void>}
   */
  async embed_model_changed() {
    await this.unload();
    await this.init();
    this.render_settings();
    await this.process_load_queue();
  }

  get connections_filter_config() { return connections_filter_config; }

}

/**
 * @constant
 * @type {Object}
 * @description Configuration for settings.
 */
export const settings_config = {
  "min_chars": {
    name: 'Minimum length',
    type: "number",
    description: "Minimum length of entity to embed (in characters).",
    placeholder: "Enter number ex. 300",
    default: 300,
  },
};

export const connections_filter_config = {
  "smart_view_filter.show_full_path": {
    "name": "Show Full Path",
    "type": "toggle",
    "description": "Show full path in view.",
    "callback": "re_render"
  },
  "smart_view_filter.render_markdown": {
    "name": "Render Markdown",
    "type": "toggle",
    "description": "Render markdown in results.",
    "callback": "re_render"
  },
  "smart_view_filter.results_limit": {
    "name": "Results Limit",
    "type": "number",
    "description": "Limit the number of results.",
    "default": 20,
    "callback": "re_render"
  },
  "smart_view_filter.exclude_inlinks": {
    "name": "Exclude Inlinks",
    "type": "toggle",
    "description": "Exclude inlinks.",
    "callback": "re_render_settings"
  },
  "smart_view_filter.exclude_outlinks": {
    "name": "Exclude Outlinks",
    "type": "toggle",
    "description": "Exclude outlinks.",
    "callback": "re_render_settings"
  },
  "smart_view_filter.include_filter": {
    "name": "Include Filter",
    "type": "text",
    "description": "Require that results match this value.",
    "callback": "re_render"
  },
  "smart_view_filter.exclude_filter": {
    "name": "Exclude Filter",
    "type": "text",
    "description": "Exclude results that match this value.",
    "callback": "re_render"
  }
};