import { CollectionItem } from "smart-collections";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";

export class SmartEntity extends CollectionItem {
  static get defaults() {
    return {
      data: {
        path: null,
        embeddings: {}, // contains keys per model
        embedding: {}, // DEPRECATED
      },
    };
  }
  save() {
    this.collection.set(this);
    this.env.save();
  }
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
  get smart_chunks() { return this.collection.smart_chunks; }
  get embed_link() { return `![[${this.data.path}]]`; }
  get multi_ajson_file_name() { return (this.path.split("#").shift()).replace(/[\s\/\.]/g, '_').replace(".md", ""); }
  get name() { return (!this.env.main.settings.show_full_path ? this.path.split("/").pop() : this.path.split("/").join(" > ")).split("#").join(" > ").replace(".md", ""); }
  get tokens() { return this.data.embeddings[this.embed_model]?.tokens; }
  get embed_model() { return this.collection?.smart_embed_model_key || "None"; }
  get vec() { return this.data?.embeddings?.[this.embed_model]?.vec; }
  // setters
  set error(error) { this.data.embeddings[this.embed_model].error = error; }
  set tokens(tokens) {
    if(!this.data.embeddings) this.data.embeddings = {};
    if(!this.data.embeddings[this.embed_model]) this.data.embeddings[this.embed_model] = {};
    this.data.embeddings[this.embed_model].tokens = tokens;
  }
  set vec(vec) {
    if(!this.data.embeddings) this.data.embeddings = {};
    if(!this.data.embeddings[this.embed_model]) this.data.embeddings[this.embed_model] = {};
    this.data.embeddings[this.embed_model].vec = vec;
  }
  get is_unembedded() {
    if(this.vec) return false;
    if(this.size < (this.env.settings?.embed_input_min_chars || 300)) return false;
    return true;
  }
  get smart_embed() { return this.collection.smart_embed; }

  // SmartSources (how might this be better done?)
  get_key() { return this.data.path; }
  get path() { return this.data.path; }
}