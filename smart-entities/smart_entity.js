import { CollectionItem } from "smart-collections";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";
import { EntityAdapter } from "smart-entities/adapters/_adapter.js";
export class SmartEntity extends CollectionItem {
  constructor(env, opts = {}) {
    super(env, opts);
    this.entity_adapter = new EntityAdapter(this);
  }
  static get defaults() {
    return {
      data: {
        path: null,
        embeddings: {}, // contains keys per model
        embedding: {}, // DEPRECATED
      },
    };
  }
  async load(){
    await super.load();
    if(!this.vec) this.queue_embed();
    // only keep active model embeddings
    Object.entries(this.data.embeddings || {}).forEach(([model, embedding]) => {
      if(model !== this.embed_model_key){
        this.data.embeddings[model] = null;
        delete this.data.embeddings[model];
      }
    });
  }
  queue_embed(){ this._queue_embed = true; }
  nearest(filter = {}) { return this.collection.nearest_to(this, filter) }
  async get_as_context(params = {}) {
    return `---BEGIN NOTE${params.i ? " " + params.i : ""} [[${this.path}]]---\n${await this.get_content()}\n---END NOTE${params.i ? " " + params.i : ""}---`;
  }
  async get_embed_input() { } // override in child class
  // find_connections v2 (smart action)
  find_connections(opts={}) {
    this.filter_opts = {
      ...(this.env.settings.smart_view_filter || {}),
      ...opts,
      entity: this,
    };
    const {limit = 50} = opts;
    if(!this.env.connections_cache) this.env.connections_cache = {};
    if(!this.env.connections_cache[this.key]){
      console.log("finding connections for", this.key);
      const connections = this.nearest(this.filter_opts)
        .sort(sort_by_score)
        .slice(0, limit)
      ;
      this.connections_to_cache(this.key, connections);
    }
    return this.connections_from_cache(this.key);
  }
  connections_from_cache(cache_key) {
    return this.env.connections_cache[cache_key].map(cache_item => {
      cache_item.item.score = cache_item.score;
      return cache_item.item;
    });
  }
  connections_to_cache(cache_key, connections) {
    this.env.connections_cache[cache_key] = connections
      .map(item => ({score: item.score, item}))
    ;
  }

  // getters
  get embed_link() { return `![[${this.data.path}]]`; }
  get embed_model_key() { return this.collection.embed_model_key; }
  get embed_model_opts() { return this.collection?.embed_model_opts || {}; }
  get model_opts() { return this.env.settings[this.collection_name]?.embed_model?.[this.embed_model_key] || {}; }
  get multi_ajson_file_name() { return (this.path.split("#").shift()).replace(/[\s\/\.]/g, '_').replace(".md", ""); }
  get name() { return (!this.should_show_full_path ? this.path.split("/").pop() : this.path.split("/").join(" > ")).split("#").join(" > ").replace(".md", ""); }
  get should_show_full_path() { return this.env.settings.show_full_path; }
  get smart_chunks() { return this.collection.smart_chunks; }
  get smart_embed() { return this.collection.smart_embed; }
  get tokens() { return this.data.embeddings[this.embed_model_key]?.tokens; }
  get is_unembedded() {
    if(this.vec) return false;
    if(this.size < (this.model_opts?.min_chars || this.env.settings?.embed_input_min_chars || 300)) return false;
    return true;
  }
  // setters
  set error(error) { this.data.embeddings[this.embed_model_key].error = error; }
  set tokens(tokens) {
    if(!this.data.embeddings) this.data.embeddings = {};
    if(!this.data.embeddings[this.embed_model_key]) this.data.embeddings[this.embed_model_key] = {};
    this.data.embeddings[this.embed_model_key].tokens = tokens;
  }

  // ADAPTER METHODS
  get vec() { return this.entity_adapter.vec; }
  set vec(vec) {
    this.entity_adapter.vec = vec;
    this._queue_embed = false;
    this.queue_save();
  }

  // SmartSources (how might this be better done?)
  get_key() { return this.data.path.replace(/\\/g, "/"); }
  get path() { return this.data.path; }
}