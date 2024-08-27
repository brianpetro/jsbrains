import { Collection } from "smart-collections";
import { top_acc } from "./top_acc.js";
import { cos_sim } from "./cos_sim.js";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";

export class SmartEntities extends Collection {
  constructor(env, opts) {
    super(env, opts);
    this.env = env; // env is the brain (brain is Deprecated)
    this.model_instance_id = null;
    this.is_processing_queue = false;
    this.queue_total = 0;
    this.embedded_total = 0;
    this.is_queue_halted = false;
    this.total_tokens = 0;
    this.start_time = null;
    this.queue_process_timeout = null;
  }
  async init() {
    await super.init();
    this.smart_chunks = new this.env.opts.smart_chunks_class(this, {
      ...this.env.settings,
      skip_blocks_with_headings_only: true
    });
    await this.load_smart_embed();
  }
  // async _save() { await this.adapter._save_queue(); } // async b/c Obsidian API is async
  unload() {
    if (typeof this.smart_embed?.unload === 'function') {
      this.smart_embed.unload();
      this.smart_embed = null; // uses setter to update env.smart_embed_active_models
    }
  }
  get SmartEmbedModel() { return this.env.smart_embed_model_class; }
  async load_smart_embed() {
    if (!this.SmartEmbedModel) return console.log("SmartEmbedModel must be included in the `env.modules` property");
    if (this.smart_embed_model_key === "None") return; // console.log("SmartEmbed disabled for ", this.collection_name);
    if (this.env.smart_embed_active_models[this.smart_embed_model_key] instanceof this.SmartEmbedModel) {
      this.smart_embed = this.env.smart_embed_active_models[this.smart_embed_model_key];
      console.log("SmartEmbed already loaded for " + this.collection_name + ": Model: " + this.smart_embed_model_key);
    } else {
      const model = { model_key: this.smart_embed_model_key };
      if (this.smart_embed_model_key.includes("/")) { // TODO: better way to detect local model
        console.log(this.env.local_model_type);
        this.model_instance_id = this.smart_embed_model_key;
        const local_max = this.env.config.local_embedding_max_tokens;
        if (local_max < model.max_tokens) model.max_tokens = local_max;
        // check if http://localhost:37420/embed is available
        console.log('Checking for local Smart Connect server...');
        try {
          const request_adapter = this.env.main.obsidian?.requestUrl || null;
          const sc_local = !request_adapter ? await fetch('http://localhost:37421/') : await request_adapter({ url: 'http://localhost:37421/', method: 'GET' });
          // console.log(sc_local);
          if (sc_local.status === 200) {
            console.log('Local Smart Connect server found');
            this.smart_embed = await this.SmartEmbedModel.create(this.env, { ...model, request_adapter: request_adapter, adapter: 'local_api', local_endpoint: 'http://localhost:37421/embed_batch' });
            return;
          }
        } catch (err) {
          console.log('Could not connect to local Smart Connect server');
        }
        if (this.env.local_model_type === 'Web') {
          this.model_instance_id += '_web'; // model registry name
          if (this.smart_embed) console.log(`Existing WebAdapter for ${this.collection_name} model: ${this.smart_embed_model_key}`);
          else this.smart_embed = await this.SmartEmbedModel.create(this.env, { ...model, adapter: 'iframe', container: this.smart_embed_container });
        } else {
          this.model_instance_id += '_node'; // model registry name
          if (this.smart_embed) console.log(`Existing NodeAdapter for ${this.collection_name} model: ${this.smart_embed_model_key}`); // Check if a connection for this model already exists
          else this.smart_embed = await this.SmartEmbedModel.create(this.env, { ...model, adapter: 'transformers' });
        }
      } else { // is API model
        this.model_instance_id += '_api'; // model registry name
        if (this.smart_embed) console.log(`Existing ApiAdapter for ${this.collection_name} model: ${this.smart_embed_model_key}`); // Check if a connection for this model already exists
        else this.smart_embed = await this.SmartEmbedModel.create(this.env, { ...model, request_adapter: this.env.main.obsidian?.requestUrl, api_key: this.config.api_key });
      }
    }
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
  get smart_embed() { return this.env.smart_embed_active_models?.[this.model_instance_id]; }
  set smart_embed(val) {
    if (!this.model_instance_id) this.model_instance_id = val.model_name + "_" + val.constructor.name;
    if (!this.env.smart_embed_active_models) this.env.smart_embed_active_models = {};
    this.env.smart_embed_active_models[this.model_instance_id] = val;
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
  get file_name() { return this.collection_name + '-' + this.smart_embed_model_key.split("/").pop(); }
  get smart_embed_model_key() {
    return (
      this.env.settings?.[this.collection_name]?.embed_model
      || this.env.settings?.[this.collection_name + "_embed_model"] // DEPRECATED: backwards compatibility
      || "None"
    );
  }

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
    const embeddings = await this.smart_embed.embed_batch(hypotheticals.map(h => ({embed_input: h})));
    const filter = {
      ...(this.env.chats?.current?.scope || {}),
      ...(params.filter || {}),
    };
    console.log({filter});
    const results = embeddings.flatMap((embedding, i) => {
      return this.nearest(embedding.vec, filter);
    });
    const k = params.k || this.env.settings.lookup_k || 10;
    const top_k = results
      .sort(sort_by_score)
      .filter((r, i, a) => a.findIndex(t => t.data.path === r.data.path) === i)
      .slice(0, k)
    ;
    // DO: decided how to re-implement these functions
    // console.log("nearest before std dev slice", top_k.length);
    // top_k = get_nearest_until_next_dev_exceeds_std_dev(top_k); // tested
    // console.log("nearest after std dev slice", top_k.length);
    // top_k = sort_by_len_adjusted_similarity(top_k); // tested
    // console.log(top_k);
    console.log(`Found and returned ${top_k.length} ${this.collection_name}.`);
    return top_k;
  }
  get settings_config() { return settings_config; }
  get filter_config() { return filter_config; }

  async process_embed_queue() {
    if (this.is_queue_halted || this.is_processing_queue) return;

    const queue = Object.values(this.items).filter(item => item._queue_embed);
    if(!queue.length) return console.log("Smart Connections: No items in embed queue");
    console.log(`Smart Connections: Processing embed queue: ${queue.length} items`);
    
    this.queue_total = queue.length;
    await this._process_embed_queue(queue);
  }

  async _process_embed_queue(queue) {
    if (this.is_processing_queue) return;
    this.is_processing_queue = true;
    if(!this.start_time) this.start_time = Date.now();

    try {
      while (queue.length > 0 && !this.is_queue_halted) {
        await this._process_embed_batch(queue);
      }
    } catch (error) {
      console.error("Error in _process_embed_queue:", error);
    } finally {
      this.is_processing_queue = false;
      if (queue.length === 0) this._embed_queue_complete();
    }
  }

  async _process_embed_batch(queue) {
    const batch_size = this.smart_embed.batch_size;
    const batch = queue.splice(0, batch_size);
    try {
      await this._prepare_embed_batch(batch);
      const resp = await this.smart_embed.embed_batch(batch);
      if (!resp || resp.error) throw new Error(`Error embedding batch: ${JSON.stringify(resp, null, 2)}`);
      await this._handle_embed_batch_response(batch, resp);
    } catch (error) {
      console.error("Error processing embed batch:", error);
      queue.unshift(...batch);
      throw error;
    }
  }

  async _prepare_embed_batch(batch) {
    await Promise.all(batch.map(item => item.get_embed_input()));
  }

  async _handle_embed_batch_response(batch, resp) {
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const response_item = resp[i];

      item.vec = response_item.vec;
      item._embed_input = null;
      item._queue_embed = false;
      item.queue_save();

      if (response_item?.tokens) {
        this.total_tokens += response_item.tokens;
      } else {
        console.warn("Unexpected response item:", response_item);
      }

      this.embedded_total++;
      this._update_embed_progress();
    }
  }

  _update_embed_progress() {
    if (this.embedded_total % 100 === 0) {
      this._show_embed_progress_notice();
    }
  }

  _show_embed_progress_notice() {
    const pause_btn = { text: "Pause", callback: this.halt_embed_queue_processing.bind(this), stay_open: true };
    this.env.main.notices.show('embedding_progress', 
      [
        `Making Smart Connections...`,
        `Embedding progress: ${this.embedded_total} / ${this.queue_total}`,
        `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.smart_embed.model_name}`
      ],
      { 
        timeout: 0,
        button: pause_btn
      }
    );
  }

  _calculate_embed_tokens_per_second() {
    const elapsed_time = (Date.now() - this.start_time) / 1000;
    return Math.round(this.total_tokens / elapsed_time);
  }

  _embed_queue_complete() {
    if (this.completed_embed_queue_timeout) clearTimeout(this.completed_embed_queue_timeout);
    this.completed_embed_queue_timeout = setTimeout(() => {
      this._show_embed_completion_notice();
      this._reset_embed_queue_stats();
      this.env.save();
    }, 3000);
  }

  _show_embed_completion_notice() {
    this.env.main.notices.remove('embedding_progress');
    this.env.main.notices.show('embedding_complete', [
      `Embedding complete.`,
      `${this.embedded_total} entities embedded.`,
      `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.smart_embed.model_name}`
    ], { timeout: 10000 });
  }

  _reset_embed_queue_stats() {
    this.embedded_total = 0;
    this.queue_total = 0;
    this.total_tokens = 0;
    this.start_time = null;
  }

  halt_embed_queue_processing() {
    this.is_queue_halted = true;
    clearTimeout(this.queue_process_timeout);
    console.log("Embed queue processing halted");
    this.env.main.notices.remove('embedding_progress');
    this.env.main.notices.show('embedding_paused', [
      `Embedding paused.`,
      `Progress: ${this.embedded_total} / ${this.queue_total}`,
      `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.smart_embed.model_name}`
    ],
    {
      timeout: 0,
      button: { text: "Resume", callback: this.resume_embed_queue_processing.bind(this) }
    });
    this.start_time = null;
    this.env.save();
  }

  resume_embed_queue_processing(delay = 0) {
    this.is_queue_halted = false;
    clearTimeout(this.queue_process_timeout);
    this.queue_process_timeout = setTimeout(() => {
      console.log("Resuming embed queue processing");
      this.process_embed_queue();
    }, delay);
  }
}

export const settings_config = {
  smart_sources_embed_model: {
    name: 'Notes Embedding Model',
    type: "dropdown",
    description: "Select a model to use for embedding your notes.",
    options_callback: 'get_embedding_model_options',
    callback: 'restart',
    // required: true
  },
  smart_blocks_embed_model: {
    name: 'Blocks Embedding Model',
    type: "dropdown",
    description: "Select a model to use for embedding your blocks.",
    options_callback: 'get_embedding_model_options',
    callback: 'restart',
    // required: true
  },
  embed_input_min_chars: {
    name: 'Minimum Embedding Length',
    type: "number",
    description: "Minimum length of note to embed.",
    placeholder: "Enter a number",
    // callback: 'refresh_embeddings',
    // required: true,
  },
  api_key: {
    name: 'OpenAI API Key for embeddings',
    type: "password",
    description: "Required for OpenAI embedding models",
    placeholder: "Enter your OpenAI API Key",
    callback: 'test_api_key_openai_embeddings',
    conditional_callback: (settings) => !settings.smart_sources_embed_model.includes('/') || !settings.smart_blocks_embed_model.includes('/')
  },
  local_embedding_max_tokens: {
    name: 'Local Embedding Max Tokens',
    type: "dropdown",
    description: "Reduce max tokens depending on available resources (CPU, RAM).",
    option_1: "512",
    option_2: "1024",
    option_3: "2048|2048 (default)",
    option_4: "4096",
    option_5: "8192",
    callback: 'reload_env',
    conditional_callback: (settings) => settings.smart_sources_embed_model.includes('/') || settings.smart_blocks_embed_model.includes('/')
  },
  // "cohere_api_key": {
  //   type: "text",
  //   name: "Cohere API Key",
  //   description: "API Key required to use Cohere re-ranker.",
  //   placeholder: "Enter an API Key",
  //   button: "Save",
  // },
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