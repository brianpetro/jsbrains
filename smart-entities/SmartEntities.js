import { Collection } from "smart-collections/Collection.js";
import { top_acc } from "./top_acc.js";
import { cos_sim } from "./cos_sim.js";

export class SmartEntities extends Collection {
  constructor(env, opts) {
    super(env, opts);
    this.env = env; // env is the brain (brain is Deprecated)
    this._pause_embeddings = false; // used to pause ensure_embeddings
  }
  async _save() { await this.adapter._save_queue(); } // async b/c Obsidian API is async
  replacer(key, value) {
    if (value instanceof this.item_type) {
      if (!value.validate_save()) {
        console.log("Invalid block, skipping save: ", value.data);
        return undefined; // skip if invalid
      }
      // if(value.data.embedding.vec && value.data.text) value.data.text = undefined; // clear text if embedding exists
      if (value.data.embeddings?.[this.embed_model]?.vec && value.data.text) value.data.text = undefined; // clear text if embedding exists
      return value.data;
    }
    return super.replacer(key, value);
  }
  unload() {
    if (typeof this.smart_embed?.unload === 'function') {
      this.smart_embed.unload();
      delete this.smart_embed;
    }
  }
  async load() {
    await super.load(); // MUST RUN BEFORE SMART EMBED async b/c Obsidian API is async
    console.log(this);
    console.log(this.env);
    await this.load_smart_embed();
  }
  get SmartEmbedModel() { return this.env.modules.SmartEmbedModel; }
  async load_smart_embed() {
    if (!this.SmartEmbedModel) return console.log("SmartEmbedModel must be included in the `env.modules` property");
    // console.log("Loading SmartEmbed for " + this.collection_name + " Model: " + this.smart_embed_model);
    if (this.smart_embed_model === "None") return; // console.log("SmartEmbed disabled for ", this.collection_name);
    if (this.env.smart_embed_active_models[this.smart_embed_model] instanceof this.SmartEmbedModel) {
      this.smart_embed = this.env.smart_embed_active_models[this.smart_embed_model];
      console.log("SmartEmbed already loaded for " + this.collection_name + ": Model: " + this.smart_embed_model);
    } else {
      const model = { model_key: this.smart_embed_model };
      if (this.smart_embed_model.includes("/")) { // TODO: better way to detect local model
        console.log(this.env.local_model_type);
        this.model_key = this.smart_embed_model;
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
            // this.env.smart_sources.import = async (files = null) => {
            //   const requestUrl = this.env.main.obsidian.requestUrl;
            //   const resp = await requestUrl({ url: 'http://localhost:37421/import_entities', method: 'POST', body: JSON.stringify({ files }) });
            //   console.log("import resp: ", resp);
            //   this.env.main.notices.show('importing from Smart Connect', resp.notice, { timeout: 10000 });
            //   let follow_up_resp = {};
            //   while (!follow_up_resp.notice !== ('recently imported')) {
            //     follow_up_resp = await requestUrl({ url: 'http://localhost:37421/import_entities', method: 'POST', body: JSON.stringify({ files }) });
            //     this.env.main.notices.remove('importing from Smart Connect');
            //     this.env.main.notices.show('importing from Smart Connect', follow_up_resp.notice, { timeout: 10000 });
            //     await new Promise(resolve => setTimeout(resolve, 3000));
            //     console.log("follow_up_resp: ", follow_up_resp);
            //   }
            //   this.env.main.notices.remove('importing from Smart Connect');
            //   this.env.main.notices.show('imported from Smart Connect', follow_up_resp.notice, { timeout: 10000 });
            // };
            // this.env.smart_blocks.import = this.env.smart_sources.import;
            return;
          }
        } catch (err) {
          console.log('Could not connect to local Smart Connect server');
        }
        if (this.env.local_model_type === 'Web') {
          this.model_key += '_web'; // model registry name
          if (this.smart_embed) console.log(`Existing WebAdapter for ${this.collection_name} model: ${this.smart_embed_model}`);
          else this.smart_embed = await this.SmartEmbedModel.create(this.env, { ...model, adapter: 'iframe', container: this.smart_embed_container });
        } else {
          this.model_key += '_node'; // model registry name
          if (this.smart_embed) console.log(`Existing NodeAdapter for ${this.collection_name} model: ${this.smart_embed_model}`); // Check if a connection for this model already exists
          else this.smart_embed = await this.SmartEmbedModel.create(this.env, { ...model, adapter: 'transformers' });
        }
      } else { // is API model
        this.model_key += '_api'; // model registry name
        if (this.smart_embed) console.log(`Existing ApiAdapter for ${this.collection_name} model: ${this.smart_embed_model}`); // Check if a connection for this model already exists
        else this.smart_embed = await this.SmartEmbedModel.create(this.env, { ...model, request_adapter: this.env.main.obsidian?.requestUrl, api_key: this.config.api_key });
      }
    }
  }
  get smart_embed_container() {
    if (!this.model_key) return console.log('model_key not set');
    const id = this.model_key.replace(/[^a-zA-Z0-9]/g, '_');
    if (!window.document) return console.log('window.document not available');
    if (window.document.querySelector(`#${id}`)) return window.document.querySelector(`#${id}`);
    const container = window.document.createElement('div');
    container.id = id;
    window.document.body.appendChild(container);
    return container;
  }
  get smart_embed() { return this.env.active_embed_models?.[this.model_key]; }
  set smart_embed(val) {
    if (!this.model_key) this.model_key = val.model_name + "_" + val.constructor.name;
    if (!this.env.active_embed_models) this.env.active_embed_models = {};
    this.env.active_embed_models[this.model_key] = val;
  }
  pause_embedding() {
    this._pause_embeddings = true;
    this.env.main.notices.remove('embedding progress');
  }
  async ensure_embeddings(show_notice = null) {
    console.log("ensure_embeddings");
    if (!this.smart_embed) return console.log("SmartEmbed not loaded for " + this.collection_name);
    const unembedded_items = this.unembedded_items; // gets all without vec
    if (unembedded_items.length === 0) return true; // skip if no unembedded items
    console.log("unembedded_items: ", unembedded_items);
    const performance_notice_msg = "(This is a resource intensive operation)";
    if ((show_notice !== false) && (unembedded_items.length > 30)) {
      const start_btn = { text: "Start embedding", callback: () => this.ensure_embeddings(false) };
      this.env.main.notices.show('start embedding', [`Are you ready to begin embedding ${unembedded_items.length} ${this.collection_name}?`, performance_notice_msg], { timeout: 0, confirm: start_btn });
      return false;
    }
    if (this.is_embedding) return console.log('already embedding');
    this.is_embedding = true;
    const batch_size = this.smart_embed.batch_size;
    this.env.main.notices.remove('start embedding');
    let total_tokens = 0;
    let time_start = Date.now();
    let time_elapsed = 0;
    let tokens_per_sec = 0;
    let last_notice_ts = Date.now();
    for (let i = 0; i < unembedded_items.length; i += batch_size) {
      // set timeout to set is_embedding to false if it takes too long
      clearTimeout(this.is_embedding_timeout);
      this.is_embedding_timeout = setTimeout(() => {
        this.is_embedding = false;
        console.log("embedding timeout");
      }, 60000);
      // console.log("i: ", i);
      if (this._pause_embeddings) {
        // console.log("pause_embeddings");
        this.is_embedding = false;
        this._pause_embeddings = false;
        const restart_btn = { text: "Restart", callback: () => this.ensure_embeddings() };
        this.env.main.notices.show('restart embedding', [`Embedding ${this.collection_name}...`, `Paused at ${i} / ${unembedded_items.length} ${this.collection_name}`, performance_notice_msg], { timeout: 0, button: restart_btn });
        this.adapter._save_queue(); // save immediately, overwrites existing file
        return;
      }
      // if divisible by 100 or last shown more than one minute ago
      if (i % 200 === 0 || (Date.now() - last_notice_ts > 60000)) {
        last_notice_ts = Date.now();
        // const pause_btn = {text: "Pause", callback: () => this.pause_embedding(), stay_open: true};
        const pause_btn = { text: "Pause", callback: this.pause_embedding.bind(this), stay_open: true };
        this.env.main.notices.show('embedding progress', [`Embedding ${this.collection_name}...`, `Progress: ${i} / ${unembedded_items.length} ${this.collection_name}`, `${tokens_per_sec} tokens/sec`, performance_notice_msg], { timeout: 0, button: pause_btn, immutable: true });
      }
      const items = unembedded_items.slice(i, i + batch_size);
      await Promise.all(items.map(async (item) => await item.get_embed_input())); // make sure all items have embed_input (in cache for call by embed_batch)
      const resp = await this.smart_embed.embed_batch(items);
      if (resp.error) {
        console.log("error embedding batch: ", resp.error);
        this.is_embedding = false;
        return false;
      }
      // console.log("resp: ", resp);
      items.forEach(item => {
        item._embed_input = null; // clear _embed_input cache after embedding
        item.queue_save();
      });
      total_tokens += resp.reduce((acc, item) => acc + item.tokens, 0);
      time_elapsed = Date.now() - time_start;
      tokens_per_sec = Math.round(total_tokens / (time_elapsed / 1000));
      // console.log(items.filter(i => !i.vec).map(item => item));
      if (i && (i % 500 === 0)) {
        // console.log(unembedded_items[i]);
        await this.adapter._save_queue();
      }
      // console.log("done i: ", i);
    }
    if (this.env.main._notice?.noticeEl?.parentElement) this.env.main._notice.hide();
    const embedded_ct = unembedded_items.filter(i => i.vec).length;
    // console.log(unembedded_items.map(i => i.key));
    this.env.main.notices.remove('embedding progress');
    this.env.main.notices.show('done embedding', [`Embedding ${this.collection_name}...`, `Done creating ${embedded_ct} embeddings.`], { timeout: 10000 });
    if (unembedded_items.length) this.adapter._save_queue();
    this.is_embedding = false;
    return true;
  }
  get embedded_items() { return this.smart_embed ? Object.values(this.items).filter(i => i.vec) : Object.values(this.items); }
  get unembedded_items() { return this.smart_embed ? Object.values(this.items).filter(item => !item.vec) : []; }

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
  get file_name() { return this.collection_name + '-' + this.smart_embed_model.split("/").pop(); }
  get smart_embed_model() { return this.config[this.collection_name + "_embed_model"]; }
}
