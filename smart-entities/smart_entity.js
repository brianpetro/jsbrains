import { CollectionItem } from "smart-collections/CollectionItem.js";
import { prepare_filter } from "./utils/prepare_filter.js";
import { sort_by_score } from "./utils/sort_by_score.js";

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
  find_connections(params={}) {
    params = {
      ...(this.env.settings.smart_view_filter || {}),
      ...params,
    };
    const {limit = 50} = params;
    if(!this.env.connections_cache[this.key]){
      const filter_opts = prepare_filter(this.env, this, params);
      const nearest = this.nearest(filter_opts);
      this.env.connections_cache[this.key] = nearest.sort(sort_by_score);
    }
    return this.env.connections_cache[this.key].slice(0, limit);
  }

  // getters
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
}