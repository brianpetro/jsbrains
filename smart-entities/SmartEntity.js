import { CollectionItem } from "smart-collections/CollectionItem.js";
import { find_connections } from "./actions/find_connections.js";

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
  get_key() { return this.data.path; }
  // DO: clarified/improved logic
  save() {
    this.collection.set(this);
    this.env.save();
  }
  nearest(filter = {}) { return this.collection.nearest_to(this, filter) }
  async get_as_context(params = {}) {
    return `---BEGIN NOTE${params.i ? " " + params.i : ""} [[${this.path}]]---\n${await this.get_content()}\n---END NOTE${params.i ? " " + params.i : ""}---`;
  }
  async get_content() { } // override in child class
  async get_embed_input() { } // override in child class
  // find_connections v2 (smart action)
  find_connections(params) {
    const smart_connections_filter = {...this.env.settings.smart_view_filter}; // copy to avoid mutating settings
    if(!smart_connections_filter.include_exclude){
      delete smart_connections_filter.exclude_filter;
      delete smart_connections_filter.include_filter;
    }
    delete smart_connections_filter.include_exclude; // unused in find_connections params
    return find_connections(this.env, {
      ...smart_connections_filter,
      ...params, // incoming params override settings
      key: this.key,
    });
  }

  // getters
  get embed_link() { return `![[${this.data.path}]]`; }
  get multi_ajson_file_name() { return (this.path.split("#").shift()).replace(/[\s\/\.]/g, '_').replace(".md", ""); }
  get name() { return (!this.env.main.settings.show_full_path ? this.path.split("/").pop() : this.path.split("/").join(" > ")).split("#").join(" > ").replace(".md", ""); }
  get path() { return this.data.path; }
  get tokens() { return this.data.embeddings[this.embed_model]?.tokens; }
  get embed_model() { return this.collection?.smart_embed_model_key || "None"; }
  get vec() { return this.data?.embeddings?.[this.embed_model]?.vec; }
  get embedding() { return this.data.embeddings?.[this.embed_model]; }
  // setters
  set embedding(embedding) {
    if (!this.data.embeddings) this.data.embeddings = {};
    this.data.embeddings[this.embed_model] = embedding;
  }
  set error(error) { this.data.embeddings[this.embed_model].error = error; }
  set tokens(tokens) {
    if (!this.embedding) this.embedding = {};
    this.embedding.tokens = tokens;
  }
  set vec(vec) {
    if (!this.embedding) this.embedding = {};
    this.data.embeddings[this.embed_model].vec = vec;
  }
  get is_unembedded() {
    if(this.vec) return false;
    if(this.size < (this.env.settings?.embed_input_min_chars || 300)) return false;
    return true;
  }
  get smart_embed() { return this.collection.smart_embed; }

  // FS
  get fs() { return this.collection.fs; }

}
