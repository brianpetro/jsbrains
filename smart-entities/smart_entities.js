import { Collection } from "smart-collections";
import { top_acc } from "./top_acc.js";
import { cos_sim } from "./cos_sim.js";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";

export class SmartEntities extends Collection {
  constructor(env, opts) {
    super(env, opts);
    this.model_instance_id = null;
    this.is_processing_queue = false;
    this.queue_total = 0;
    this.embedded_total = 0;
    this.is_queue_halted = false;
    this.total_tokens = 0;
    this.total_time = 0;
  }
  get smart_chunks() {
    if(!this._smart_chunks) {
      const config = this.env.opts.modules.smart_chunks;
      const _class = config?.class ?? config;
      if(!_class) throw new Error("No class in `env.opts.modules.smart_chunks`");
      this._smart_chunks = new _class(this, {
        ...this.env.settings,
        skip_blocks_with_headings_only: true
      });
    }
    return this._smart_chunks;
  }
  async init() {
    await super.init();
    await this.load_smart_embed();
    if (!this.embed_model) {
      console.log(`SmartEmbed not loaded for ${this.collection_key}. Continuing without embedding capabilities.`);
    }
  }
  async load_smart_embed() {
    if(this.embed_model_key === 'None') return;
    if(this.embed_model.loading) return console.log(`SmartEmbedModel already loading for ${this.embed_model_key}`);
    if(this.embed_model.loaded) return console.log(`SmartEmbedModel already loaded for ${this.embed_model_key}`);
    await this.embed_model.load();
  }
  unload() {
    if (typeof this.embed_model?.unload === 'function') {
      this.embed_model.unload();
      this.embed_model = null; // uses setter to update env.smart_embed_active_models
    }
    super.unload();
  }
  get embed_model_key() {
    // return this.env.settings?.[this.collection_key]?.embed_model?.model_key
    //   || this.env.settings?.[this.collection_key + "_embed_model"] // DEPRECATED: backwards compatibility
    //   || "TaylorAI/bge-micro-v2"
    // ;
    return this.settings?.embed_model?.model_key || "TaylorAI/bge-micro-v2";
  }
  get embed_model_settings() {
    if(!this.settings.embed_model?.[this.embed_model_key]) this.settings.embed_model[this.embed_model_key] = {};
    return this.settings.embed_model[this.embed_model_key];
  }
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
   * @deprecated use embed_model instead
   */
  get smart_embed() { return this.embed_model; }
  get embed_model() {
    // if(this.embed_model_key === "None") return;
    if(!this.env.smart_embed_active_models?.[this.embed_model_key]){
      this.env.smart_embed_active_models[this.embed_model_key] = new this.env.opts.modules.smart_embed_model.class(this.env, {
        model_key: this.embed_model_key,
        ...(this.settings.embed_model?.[this.embed_model_key] || {})
      });
    }
    return this.env.smart_embed_active_models?.[this.embed_model_key];
  }
  nearest_to(entity, filter = {}) { return this.nearest(entity.vec, filter); }
  // DEPRECATED in favor of entity-based nearest_to(entity, filter)
  nearest(vec, filter = {}) {
    if (!vec) return console.log("no vec");
    const {
      results_count = 50, // DO: default configured in settings
    } = filter;
    const nearest = this.filter(filter)
      .reduce((acc, item) => {
        if (!item.vec) return acc; // skip if no vec
        item.score = cos_sim(vec, item.vec);
        item.sim = item.score; // DEPRECATED alias
        top_acc(acc, item, results_count); // update acc
        return acc;
      }, { min: 0, items: new Set() });
    return Array.from(nearest.items);
  }
  get file_name() { return this.collection_key + '-' + this.smart_embed_model_key.split("/").pop(); }
  get smart_embed_model_key() {
    return (
      this.env.settings?.[this.collection_key]?.embed_model
      || this.env.settings?.[this.collection_key + "_embed_model"] // DEPRECATED: backwards compatibility
      || "None"
    );
  }
  get data_dir() { return this.env.env_data_dir + this.fs.sep + this.embed_model_key.replace("/", "_"); }

  /**
   * Calculates the relevance of an item based on the search filter.
   * 
   * @param {Object} item - The item to calculate relevance for.
   * @param {Object} search_filter - The search filter containing keywords.
   * @returns {number} The relevance score:
   *                   1 if any keyword is found in the item's path,
   *                   0 otherwise (default relevance for keyword in content).
   */
  calculate_relevance(item, search_filter) {
    // if keyword in search_filter is in item.data.path, return 1
    if(search_filter.keywords.some(keyword => item.data.path?.includes(keyword))) return 1;
    return 0; // default relevance (keyword in content)
  }
  /**
   * Overrides the prepare_filter method to add entity-based filters.
   * This method requires the entity to be set in the options.
   * 
   * @param {Object} opts - The filter options.
   * @param {Object} opts.entity - The entity to base the filters on.
   * @param {string|string[]} opts.exclude_filter - Keys or prefixes to exclude.
   * @param {string|string[]} opts.include_filter - Keys or prefixes to include.
   * @param {boolean} opts.exclude_inlinks - Whether to exclude inlinks of the entity.
   * @param {boolean} opts.exclude_outlinks - Whether to exclude outlinks of the entity.
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
    
    if(entity) {
      opts.exclude_key_starts_with = entity.key; // exclude current entity
      // include/exclude filters
      if (exclude_filter) {
        if (opts.exclude_key_starts_with) {
          opts.exclude_key_starts_with_any = [opts.exclude_key_starts_with];
          delete opts.exclude_key_starts_with;
        } else if (!Array.isArray(opts.exclude_key_starts_with_any)) opts.exclude_key_starts_with_any = [];
        if (typeof exclude_filter === "string") opts.exclude_key_starts_with_any.push(exclude_filter);
        else if (Array.isArray(exclude_filter)) opts.exclude_key_starts_with_any.push(...exclude_filter);
      }
      if (include_filter) {
        if (!Array.isArray(opts.key_starts_with_any)) opts.key_starts_with_any = [];
        if (typeof include_filter === "string") opts.key_starts_with_any.push(include_filter);
        else if (Array.isArray(include_filter)) opts.key_starts_with_any.push(...include_filter);
      }
      // exclude inlinks
      if (exclude_inlinks && this.env.links[entity.data.path]) {
        if (!Array.isArray(opts.exclude_key_starts_with_any)) opts.exclude_key_starts_with_any = [];
        opts.exclude_key_starts_with_any.push(...Object.keys(this.env.links[entity.data.path] || {}));
      }
      // exclude outlinks
      if (exclude_outlinks && this.env.links[entity.data.path]) {
        if (!Array.isArray(opts.exclude_key_starts_with_any)) opts.exclude_key_starts_with_any = [];
        opts.exclude_key_starts_with_any.push(...entity.outlink_paths);
      }
    }
    return opts;
  }
  async lookup(params={}) {
    const { hypotheticals = [] } = params;
    if(!hypotheticals?.length) return {error: "hypotheticals is required"};
    if(!this.smart_embed) return {error: "Embedding search is not enabled."};
    const hyp_vecs = await this.smart_embed.embed_batch(hypotheticals.map(h => ({embed_input: h})));
    const filter = {
      ...(this.env.chats?.current?.scope || {}),
      ...(params.filter || {}),
    };
    const results = hyp_vecs
      .reduce((acc, embedding, i) => {
        const nearests = this.nearest(embedding.vec, filter);
        nearests.forEach(entity => {
          if(!acc[entity.data.path] || entity.score > acc[entity.data.path].score){
            acc[entity.data.path] = {key: entity.key, score: entity.score, entity, hypothetical_i: i};
          }else{
            // DEPRECATED: handling when last score added to entity is not top score (needs to be fixed in Entities.nearest handling)
            entity.score = acc[entity.data.path].score;
          }
        });
        return acc;
      }, {})
    ;
    const k = params.k || this.env.settings.lookup_k || 10;
    const top_k = Object.values(results)
      .sort(sort_by_score)
      .slice(0, k)
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
  get settings_config() {
    return this.process_settings_config({
      ...super.settings_config,
      ...(this.embed_model?.settings_config || {}),
      ...settings_config,
    });
  }

  get filter_config() { return filter_config; }
  
  get notices() { return this.env.smart_connections_plugin?.notices || this.env.main?.notices; }
  async process_embed_queue() {
    if(this.embed_model_key === "None") return console.log(`Smart Connections: No active embedding model for ${this.collection_key}, skipping embedding`);
    if(!this.embed_model) return console.log(`Smart Connections: No active embedding model for ${this.collection_key}, skipping embedding`);
    if (this.is_queue_halted || this.is_processing_queue) return;
    const queue = Object.values(this.items).filter(item => item._queue_embed);
    this.queue_total = queue.length;
    if(!this.queue_total) return console.log(`Smart Connections: No items in ${this.collection_key} embed queue`);
    console.log(`Processing ${this.collection_key} embed queue: ${this.queue_total} items`);
    this.is_processing_queue = true;
    for(let i = this.embedded_total; i < this.queue_total; i += this.embed_model.batch_size) {
      if(this.is_queue_halted) break;
      const batch = queue.slice(i, i + this.embed_model.batch_size);
      await Promise.all(batch.map(item => item.get_embed_input())); // decided/future: may be handled in SmartEmbedModel
      const start_time = Date.now();
      await this.embed_model.embed_batch(batch);
      this.total_time += Date.now() - start_time;
      this.embedded_total += batch.length;
      this.total_tokens += batch.reduce((acc, item) => acc + (item.tokens || 0), 0);
      this._show_embed_progress_notice();
    }
    this.is_processing_queue = false;
    if(!this.is_queue_halted) this._embed_queue_complete();
  }
  _show_embed_progress_notice() {
    if(this.is_queue_halted) return;
    if(this.embedded_total - this.last_notice_embedded_total < 100) return;
    this.last_notice_embedded_total = this.embedded_total;
    const pause_btn = { text: "Pause", callback: this.halt_embed_queue_processing.bind(this), stay_open: true };
    this.notices?.show('embedding_progress', 
      [
        `Making Smart Connections...`,
        `Embedding progress: ${this.embedded_total} / ${this.queue_total}`,
        `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.smart_embed.opts.model_key}`
      ],
      { 
        timeout: 0,
        button: pause_btn
      }
    );
  }
  _show_embed_completion_notice() {
    this.notices?.remove('embedding_progress');
    this.notices?.show('embedding_complete', [
      `Embedding complete.`,
      `${this.embedded_total} entities embedded.`,
      `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.smart_embed.opts.model_key}`
    ], { timeout: 10000 });
  }
  _calculate_embed_tokens_per_second() {
    const elapsed_time = this.total_time / 1000;
    return Math.round(this.total_tokens / elapsed_time);
  }
  _embed_queue_complete() {
    this.is_processing_queue = false;
    if (this.completed_embed_queue_timeout) clearTimeout(this.completed_embed_queue_timeout);
    this.completed_embed_queue_timeout = setTimeout(() => {
      this._show_embed_completion_notice();
      this._reset_embed_queue_stats();
      this.env.save();
    }, 3000);
  }
  _reset_embed_queue_stats() {
    this.embedded_total = 0;
    this.queue_total = 0;
    this.total_tokens = 0;
    this.total_time = 0;
    this.last_notice_embedded_total = 0;
    this.is_processing_queue = false;
    this.is_queue_halted = false;
  }
  halt_embed_queue_processing() {
    this.is_queue_halted = true;
    console.log("Embed queue processing halted");
    this.notices?.remove('embedding_progress');
    this.notices?.show('embedding_paused', [
      `Embedding paused.`,
      `Progress: ${this.embedded_total} / ${this.queue_total}`,
      `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.smart_embed.opts.model_key}`
    ],
    {
      timeout: 0,
      button: { text: "Resume", callback: () => this.resume_embed_queue_processing(0) }
    });
    this.env.save();
  }
  resume_embed_queue_processing(delay = 0) {
    this.is_queue_halted = false;
    setTimeout(() => {
      this.process_embed_queue();
    }, delay);
  }

  async embed_model_changed() {
    this.unload();
    await this.init();
    this.re_render_settings();
    await this.process_load_queue();
  }


}

export const settings_config = {
  // TODO
};


export const filter_config = {
  "exclude_inlinks": {
    type: "toggle",
    name: "Exclude Inlinks",
    description: "Exclude inlinks",
  },
  "exclude_outlinks": {
    type: "toggle",
    name: "Exclude Outlinks",
    description: "Exclude outlinks",
  },
  "include_exclude": {
    type: "toggle",
    name: "Toggle Using Include/Exclude",
    description: "Toggle using include/exclude filters",
  },
  "include_filter": {
    type: "text",
    name: "Include Filter",
    description: "Require that results match this value.",
  },
  "exclude_filter": {
    type: "text",
    name: "Exclude Filter",
    description: "Exclude results that match this value.",
  },
  // "re_rank": {
  //   type: "toggle",
  //   name: "Toggle Re-Ranker",
  //   description: "Toggle the re-ranker",
  // },
};