import { Collection } from "smart-collections/Collection.js";
import { top_acc } from "./top_acc.js";
import { cos_sim } from "./cos_sim.js";

export class SmartEntities extends Collection {
  constructor(env, opts) {
    super(env, opts);
    this.env = env; // env is the brain (brain is Deprecated)
    this.model_instance_id = null;
  }
  async _save() { await this.adapter._save_queue(); } // async b/c Obsidian API is async
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
  get smart_embed_model_key() { return this.config[this.collection_name + "_embed_model"]; }
}