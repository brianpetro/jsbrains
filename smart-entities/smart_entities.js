import { Collection } from "smart-collections";
import { results_acc, furthest_acc } from "./top_acc.js";
import { cos_sim } from "./cos_sim.js";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";

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
    /** @type {string|null} */
    this.model_instance_id = null;
    /** @type {number} */
    this.embedded_total = 0;
    /** @type {boolean} */
    this.is_queue_halted = false;
    /** @type {number} */
    this.total_tokens = 0;
    /** @type {number} */
    this.total_time = 0;
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
      console.log(`SmartEmbed not loaded for ${this.collection_key}. Continuing without embedding capabilities.`);
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
      await this.embed_model.unload();
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
   * @param {Object} entity - The reference entity.
   * @param {Object} [filter={}] - Optional filters to apply.
   * @returns {Array<Result>} An array of result objects with score and item.
   */
  nearest_to(entity, filter = {}) { return this.nearest(entity.vec, filter); }

  /**
   * Finds the nearest entities to a vector based on cosine similarity.
   * @param {Array<number>} vec - The vector to compare against.
   * @param {Object} [filter={}] - Optional filters to apply.
   * @param {number} [filter.limit=50] - The maximum number of results to return.
   * @returns {Array<Result>} An array of result objects with score and item.
   */
  nearest(vec, filter = {}) {
    if (!vec) return console.log("no vec");
    const {
      limit = 50, // TODO: default configured in settings
    } = filter;
    const nearest = this.filter(filter)
      .reduce((acc, item) => {
        if (!item.vec) return acc; // skip if no vec
        const result = { item, score: cos_sim(vec, item.vec) };
        results_acc(acc, result, limit); // update acc
        return acc;
      }, { min: 0, results: new Set() });
    return Array.from(nearest.results);
  }

  furthest(vec, filter = {}) {
    if (!vec) return console.log("no vec");
    const {
      limit = 50, // TODO: default configured in settings
    } = filter;
    const furthest = this.filter(filter)
      .reduce((acc, item) => {
        if (!item.vec) return acc; // skip if no vec
        const result = { item, score: cos_sim(vec, item.vec) };
        furthest_acc(acc, result, limit); // update acc
        return acc;
      }, { max: 0, results: new Set() });
    return Array.from(furthest.results);
  }

  /**
   * Gets the file name based on collection key and embedding model key.
   * @readonly
   * @returns {string} The constructed file name.
   */
  get file_name() { return this.collection_key + '-' + this.embed_model_key.split("/").pop(); }

  // Uncomment and implement if needed
  // get data_dir() { return this.env.env_data_dir + "/" + this.embed_model_key.replace("/", "_"); }

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
        if (typeof exclude_filter === "string") opts.exclude_key_starts_with_any.push(exclude_filter);
        else if (Array.isArray(exclude_filter)) opts.exclude_key_starts_with_any.push(...exclude_filter);
      }
      if (include_filter) {
        if (!Array.isArray(opts.key_starts_with_any)) opts.key_starts_with_any = [];
        if (typeof include_filter === "string") opts.key_starts_with_any.push(include_filter);
        else if (Array.isArray(include_filter)) opts.key_starts_with_any.push(...include_filter);
      }
      // exclude inlinks
      if (exclude_inlinks && this.links?.[entity.path]) {
        if (!Array.isArray(opts.exclude_key_starts_with_any)) opts.exclude_key_starts_with_any = [];
        opts.exclude_key_starts_with_any.push(...Object.keys(this.links?.[entity.path] || {}));
      }
      // exclude outlinks
      if (exclude_outlinks) {
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
    const results = hyp_vecs
      .reduce((acc, embedding, i) => {
        const results = this.nearest(embedding.vec, filter);
        results.forEach(result => {
          if (!acc[result.item.path] || result.score > acc[result.item.path].score) {
            acc[result.item.path] = {
              key: result.item.key,
              score: result.score,
              item: result.item,
              entity: result.item, // DEPRECATED: use item instead
              hypothetical_i: i,
            };
          } else {
            // DEPRECATED: Handling when last score added to entity is not top score
            result.score = acc[result.item.path].score;
          }
        });
        return acc;
      }, {})
    ;
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
    if(!this._embed_queue.length) this._embed_queue = Object.values(this.items).filter(item => item._queue_embed && item.should_embed);
    return this._embed_queue;
  }

  /**
   * Processes the embed queue by batching and embedding items using a promise-based state.
   *
   * @async
   * @returns {Promise<void>}
   */
  async process_embed_queue() {
    this._reset_embed_queue_stats();
    if (this.embed_model_key === "None") return console.log(`Smart Connections: No active embedding model for ${this.collection_key}, skipping embedding`);
    if (!this.embed_model) return console.log(`Smart Connections: No active embedding model for ${this.collection_key}, skipping embedding`);
    const datetime_start = new Date();
    if (!this.embed_queue.length) {
      return console.log(`Smart Connections: No items in ${this.collection_key} embed queue`);
    }
    console.log(`Time spent getting embed queue: ${(new Date()).getTime() - datetime_start.getTime()}ms`);
    console.log(`Processing ${this.collection_key} embed queue: ${this.embed_queue.length} items`);
    for (let i = 0; i < this.embed_queue.length; i += this.embed_model.batch_size) {
      if (this.is_queue_halted){
        this.is_queue_halted = false;
        break;
      }
      const batch = this.embed_queue.slice(i, i + this.embed_model.batch_size);
      await Promise.all(batch.map(item => item.get_embed_input()));
      try{
        const start_time = Date.now();
        await this.embed_model.embed_batch(batch);
        this.total_time += Date.now() - start_time;
      } catch(e){
        if (e && e.message && e.message.includes("API key not set")) {
          this.halt_embed_queue_processing(`API key not set for ${this.embed_model_key}\nPlease set the API key in the settings.`);
        }
        console.error(e);
        console.error(`Error processing ${this.collection_key} embed queue: ` + JSON.stringify((e || {}), null, 2));
      }
      batch.forEach(item => {
        item.embed_hash = item.read_hash;
      });
      this.embedded_total += batch.length;
      this.total_tokens += batch.reduce((acc, item) => acc + (item.tokens || 0), 0);
      this._show_embed_progress_notice();
      // process save queue every 1000 items
      if(this.embedded_total - this.last_save_total > 1000){
        this.last_save_total = this.embedded_total;
        await this.process_save_queue();
      }
    }
    this._show_embed_completion_notice();
    this.process_save_queue();
  }



  /**
   * Displays the embedding progress notice.
   * @private
   * @returns {void}
   */
  _show_embed_progress_notice() {
    if (this.embedded_total - this.last_notice_embedded_total < 100) return;
    this.last_notice_embedded_total = this.embedded_total;
    const pause_btn = { text: "Pause", callback: this.halt_embed_queue_processing.bind(this), stay_open: true };
    this.notices?.show('embedding_progress',
      [
        `Making Smart Connections...`,
        `Embedding progress: ${this.embedded_total} / ${this.embed_queue.length}`,
        `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.embed_model_key}`
      ],
      {
        timeout: 0,
        button: pause_btn
      }
    );
  }

  /**
   * Displays the embedding completion notice.
   * @private
   * @returns {void}
   */
  _show_embed_completion_notice() {
    this.notices?.remove('embedding_progress');
    this.notices?.show('embedding_complete', [
      `Embedding complete.`,
      `${this.embedded_total} entities embedded.`,
      `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.embed_model_key}`
    ], { timeout: 10000 });
  }

  /**
   * Calculates the number of tokens processed per second.
   * @private
   * @returns {number} Tokens per second.
   */
  _calculate_embed_tokens_per_second() {
    const elapsed_time = this.total_time / 1000;
    return Math.round(this.total_tokens / elapsed_time);
  }

  /**
   * Resets the statistics related to embed queue processing.
   * @private
   * @returns {void}
   */
  _reset_embed_queue_stats() {
    this.is_queue_halted = false;
    this.last_save_total = 0;
    this._embed_queue = [];
    this.embedded_total = 0;
    this.total_tokens = 0;
    this.total_time = 0;
    this.last_notice_embedded_total = 0;
  }

  /**
   * Halts the embed queue processing.
   * @returns {void}
   */
  halt_embed_queue_processing(msg=null) {
    this.is_queue_halted = true;
    console.log("Embed queue processing halted");
    this.notices?.remove('embedding_progress');
    this.notices?.show('embedding_paused', [
      msg || `Embedding paused.`,
      `Progress: ${this.embedded_total} / ${this.embed_queue.length}`,
      `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.embed_model_key}`
    ],
      {
        timeout: 0,
        button: { text: "Resume", callback: () => this.resume_embed_queue_processing(100) }
      });
  }

  /**
   * Resumes the embed queue processing after a delay.
   * @param {number} [delay=0] - The delay in milliseconds before resuming.
   * @returns {void}
   */
  resume_embed_queue_processing(delay = 0) {
    console.log("resume_embed_queue_processing");
    this.notices?.remove('embedding_paused');
    setTimeout(() => {
      this.embedded_total = 0;
      this.process_embed_queue();
    }, delay);
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

  async render_lookup(container, opts={}) {
    if(container) container.innerHTML = 'Loading lookup...';
    const frag = await this.env.render_component('lookup', this, opts);
    if(container) {
      container.innerHTML = '';
      container.appendChild(frag);
    }
    return frag;
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
}