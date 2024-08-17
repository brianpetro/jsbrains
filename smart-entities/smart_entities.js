import { Collection } from "smart-collections";
import { top_acc } from "./top_acc.js";
import { cos_sim } from "./cos_sim.js";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";

export class SmartEntities extends Collection {
  constructor(env, opts) {
    super(env, opts);
    this.env = env; // env is the brain (brain is Deprecated)
    this.model_instance_id = null;
  }
  // async _save() { await this.adapter._save_queue(); } // async b/c Obsidian API is async
  unload() {
    if (typeof this.smart_embed?.unload === 'function') {
      this.smart_embed.unload();
      this.smart_embed = null; // uses setter to update env.smart_embed_active_models
    }
  }
  async load() {
    await super.load(); // MUST RUN BEFORE SMART EMBED async b/c Obsidian API is async
    await this.load_smart_embed();
  }
  get SmartEmbedModel() { return this.env.modules.SmartEmbedModel; }
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
  get smart_embed_model_key() { return this.config?.[this.collection_name + "_embed_model"] || "None"; }

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
    console.log("lookup", params);
    const { hypotheticals = [] } = params;
    if(!hypotheticals?.length) return {error: "hypotheticals is required"};
    console.log(this);
    if(!this.smart_embed) return {error: "Embedding search is not enabled."};
    const embeddings = await this.smart_embed.embed_batch(hypotheticals.map(h => ({embed_input: h})));
    console.log(embeddings);
    console.log({scope: this.env.chats?.current?.scope});
    const filter = {
      ...(this.env.chats?.current?.scope || {}),
      ...(params.filter || {}),
    };
    console.log({filter});
    const results = embeddings.flatMap((embedding, i) => {
      return this.nearest(embedding.vec, filter);
    });
    // console.log(results);
    // sort by sim sim desc
    results.sort(sort_by_score);
    // get top K results
    const k = params.k || this.env.config.lookup_k || 10;
    let top_k = await Promise.all(results
      // filter duplicates by r.data.path
      .filter((r, i, a) => a.findIndex(t => t.data.path === r.data.path) === i)
      .slice(0, k)
      .map(async r => {
        return {
          score: r.sim,
          path: r.data.path,
        };
      })
    );
    // DO: decided whether to use these functions
    // console.log("nearest before std dev slice", top_k.length);
    // top_k = get_nearest_until_next_dev_exceeds_std_dev(top_k); // tested
    // console.log("nearest after std dev slice", top_k.length);
    // top_k = sort_by_len_adjusted_similarity(top_k); // tested
    console.log(top_k);
    console.log(`Found and returned ${top_k.length} ${this.collection_name}.`);
    return top_k;
  }
  // Smart Sources (should be moved to SmartSources module, inherited by SmartSources and SmartBlocks)
  get fs() {
    if(this.opts?.env_path) return this.env.smart_fs[this.opts.env_path] || this.env.fs;
    return this.env.fs;
  }
}