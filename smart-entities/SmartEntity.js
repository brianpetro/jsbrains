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
  async get_content() { } // override in child class (DEPRECATED in favor of read())
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

  // FS
  get fs() { return this.collection.fs; }
  /**
   * Searches for keywords within the entity's data and content.
   * @param {Object} search_filter - The search filter object.
   * @param {string[]} search_filter.keywords - An array of keywords to search for.
   * @returns {Promise<boolean>} A promise that resolves to true if the entity matches the search criteria, false otherwise.
   */
  async search(search_filter = {}) {
    // First, run the initial filter (defined in CollectionItem)
    if (!this.filter(search_filter)) return false;
    // Extract keywords from search_filter
    const { keywords } = search_filter;
    // Validate the keywords
    if (!keywords || !Array.isArray(keywords)) {
      console.warn("Entity.search: keywords not set or is not an array");
      return false;
    }
    // Check if any keyword is in the entity's path
    if (keywords.some(keyword => this.data.path.includes(keyword))) return true;
    // Read the entity's content (uses CRUD read())
    const content = await this.read();
    // Check if any keyword is in the entity's content
    if (keywords.some(keyword => content.includes(keyword))) return true;
    // If no matches found, return false
    return false;
  }

}
