import { CollectionItem } from "smart-collections";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";
import { EntityAdapter } from "smart-entities/adapters/_adapter.js";
import { render as render_entity_component } from "./components/entity.js";

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
  init(){
    super.init();
    if(!this.vec) this.queue_embed();
    // only keep active model embeddings (may be moved)
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
  find_connections(params={}) {
    this.filter_opts = {
      ...(this.env.settings.smart_view_filter || {}),
      ...params,
      entity: this,
    };
    const limit = params.filter?.limit
      || params.limit // DEPRECATED: for backwards compatibility
      || this.env.settings.smart_view_filter?.results_limit
      || 10
    ;
    if(params.filter?.limit) delete params.filter.limit; // remove to prevent limiting in initial filter (limit should happen after nearest for lookup)
    if(params.limit) delete params.limit; // backwards compatibility
    const cache_key = this.key + JSON.stringify(params); // no objects/instances in cache key
    if(!this.env.connections_cache) this.env.connections_cache = {};
    if(!this.env.connections_cache[cache_key]){
      const connections = this.nearest(this.filter_opts)
        .sort(sort_by_score)
        .slice(0, limit)
      ;
      this.connections_to_cache(cache_key, connections);
    }
    return this.connections_from_cache(cache_key);
  }
  connections_from_cache(cache_key) {
    return this.env.connections_cache[cache_key];
  }
  connections_to_cache(cache_key, connections) {
    this.env.connections_cache[cache_key] = connections;
  }

  // getters
  get embed_link() { return `![[${this.path}]]`; }
  get embed_model_key() { return this.collection.embed_model_key; }
  get name() { return (!this.should_show_full_path ? this.path.split("/").pop() : this.path.split("/").join(" > ")).split("#").join(" > ").replace(".md", ""); }
  get should_show_full_path() { return this.env.settings.show_full_path; }
  get smart_chunks() { return this.collection.smart_chunks; }
  /**
   * @deprecated Use this.embed_model instead
   */
  get smart_embed() { return this.embed_model; }
  get embed_model() { return this.collection.embed_model; }
  get tokens() { return this.data.embeddings[this.embed_model_key]?.tokens; }
  get is_unembedded() {
    if(this.vec) return false;
    if(this.size < (this.collection.embed_model_settings?.min_chars || 300)) return false; // ignore small files
    return true;
  }
  get should_embed() { return true; } // may override in child class
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
    this._embed_input = null;
    this.queue_save();
  }
  remove_embeddings(){
    this.data.embeddings = null;
    this.queue_save();
  }

  // SmartSources (how might this be better done?)
  get_key() { return this.data.key || this.data.path; }
  get path() { return this.data.path; }

  // COMPONENTS
  get component() { return render_entity_component; }
}