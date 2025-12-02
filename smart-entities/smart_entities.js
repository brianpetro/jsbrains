/**
 * @file smart_entities.js
 * @description Manages a collection of smart entities with embedding capabilities.
 * Delegates vector operations (nearest, furthest, embedding) to the assigned vector adapter (DefaultEntitiesVectorAdapter).
 */

import { Collection } from "smart-collections";
import { sort_by_score } from "smart-utils/sort_by_score.js";
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
   * Unloads the smart embedding model.
   * @async
   * @returns {Promise<void>}
   */
  async unload() {
    if (typeof this.embed_model?.unload === 'function') {
      this.embed_model.unload();
    //   this.embed_model = null; // triggers new instance on next access
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
   * Gets the embedding model instance.
   * @readonly
   * @returns {Object|null} The embedding model instance or null if none.
   */
  get embed_model() {
    if (this.env.embedding_models.default) {
      return this.env.embedding_models.default.instance;
    }
    throw new Error("DEPRECATED SMART ENVIRONMENT LOADED: UPDATE SMART PLUGINS.");
  }
  set embed_model(embed_model) { this.env._embed_model = embed_model; }
  reload_embed_model() {
    console.log("reload_embed_model");
    this.embed_model.unload();
    this.env._embed_model = null;
  }

  /**
   * Finds the nearest entities to a given entity.
   * @async
   * @param {Object} entity - The reference entity.
   * @deprecated moved to action (type=score) and retrieve using filter_and_score()/get_results() patterns 
   * @param {Object} [filter={}] - Optional filters to apply.
   * @returns {Promise<Array<{item:Object, score:number}>>} An array of result objects with score and item.
   */
  async nearest_to(entity, filter = {}) { return await this.nearest(entity.vec, filter); }

  /**
   * Finds the nearest entities to a vector using the default adapter.
   * @async
   * @deprecated moved to action (type=score) and retrieve using filter_and_score()/get_results() patterns 
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
   * @deprecated moved to action (type=score) and retrieve using filter_and_score()/get_results() patterns 
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
   * @deprecated likely unused (2025-09-29)
   * @returns {string} The constructed file name.
   */
  get file_name() { return this.collection_key + '-' + this.embed_model_key.split("/").pop(); }


  /**
   * Looks up entities based on hypothetical content.
   * @deprecated moved to action (type=score) and retrieve using get_results() (pre-process generates hypothetical vecs)
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
      ...(this.env.chats?.current?.scope || {}), // DEPRECATED: since Smart Chat v1 (remove after removing legacy Smart Chat v0 from obsidian-smart-connections)
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
  /**
   * @deprecated use env.render_component('collection_settings', this) instead (2025-05-25: decouple UI from collections)
   */
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
    if(!this._embed_queue?.length){
      console.time(`Building embed queue`);
      this._embed_queue = Object.values(this.items).filter(item => item._queue_embed || (item.is_unembedded && item.should_embed));
      console.timeEnd(`Building embed queue`);
    }
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

  /**
   * @deprecated since v4 2025-11-28
   */
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
    "name": "Show full path",
    "type": "toggle",
    "description": "Turning on will include the folder path in the connections results.",
  },
  // "smart_view_filter.render_markdown": {
  //   "name": "Render markdown",
  //   "type": "toggle",
  //   "description": "Turn off to prevent rendering markdown and display connection results as plain text.",
  // },
  "smart_view_filter.results_limit": {
    "name": "Results limit",
    "type": "number",
    "description": "Adjust the number of connections displayed in the connections view (default 20).",
    "default": 20,
  },
  "smart_view_filter.exclude_inlinks": {
    "name": "Exclude inlinks (backlinks)",
    "type": "toggle",
    "description": "Exclude notes that already link to the current note from the connections results.",
  },
  "smart_view_filter.exclude_outlinks": {
    "name": "Exclude outlinks",
    "type": "toggle",
    "description": "Exclude notes that are already linked from within the current note from appearing in the connections results.",
  },
  "smart_view_filter.include_filter": {
    "name": "Include filter",
    "type": "text",
    "description": "Notes must match this value in their file/folder path. Matching notes will be included in the connections results. Separate multiple values with commas.",
  },
  "smart_view_filter.exclude_filter": {
    "name": "Exclude filter",
    "type": "text",
    "description": "Notes must *not* match this value in their file/folder path. Matching notes will be *excluded* from the connections results. Separate multiple values with commas.",
  },
  // should be better scoped at source-level (leaving here for now since connections_filter_config needs larger refactor)
  "smart_view_filter.exclude_blocks_from_source_connections": {
    "name": "Hide blocks in results",
    "type": "toggle",
    "description": "Show only sources in the connections results (no blocks).",
  },
  // // hide frontmatter blocks from connections results
  // "smart_view_filter.exclude_frontmatter_blocks": {
  //   "name": "Hide frontmatter blocks in results",
  //   "type": "toggle",
  //   "description": "Show only sources in the connections results (no frontmatter blocks).",
  // },
};