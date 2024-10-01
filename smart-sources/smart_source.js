import { create_hash } from "./utils/create_hash.js";
import { SmartEntity } from "smart-entities";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";

export class SmartSource extends SmartEntity {
  static get defaults() {
    return {
      data: {
        history: [], // array of { mtime, hash, length, blocks[] }
      },
      _embed_input: null, // stored temporarily
      _queue_load: true,
    };
  }
  // moved logic from SmartSources import() method
  queue_import() { this._queue_import = true; }
  async import(){
    this._queue_import = false;
    try{
      if(this.file.stat.size > 1000000) {
        console.log(`Smart Connections: Skipping large file: ${this.data.path}`);
        return;
      }
      // must check exists using async because not always reflects by file.stat (ex. Obsidian)
      if(this.loaded_at && (await this.data_fs.exists(this.data_path)) && (this.env.fs.files[this.data_path].mtime > (this.loaded_at + 3 * 60 * 1000))){
        console.log(`Smart Connections: Re-loading data source for ${this.data.path} because it has been updated on disk`);
        return await this.load();
      }
      if(this.meta_changed){
        this.data.mtime = this.file.stat.mtime;
        this.data.size = this.file.stat.size;
        await this.source_adapter.import();
        this.queue_embed();
      }else console.log(`Smart Connections: No changes to ${this.data.path}`);
    }catch(err){
      this.queue_import();
      console.error(err, err.stack);
    }
  }
  find_connections(opts={}) {
    let connections = super.find_connections(opts);
    const {limit = 50} = this.filter_opts; // super modifies opts and sets this.find_connections_opts
    if(!opts.exclude_blocks_from_source_connections) {
      const cache_key = this.key + JSON.stringify(opts) + "_blocks";
      if(!this.env.connections_cache[cache_key]){
        const nearest = this.env.smart_blocks.nearest(this.vec, this.filter_opts)
        nearest.sort(sort_by_score)
        this.env.connections_cache[cache_key] = nearest.slice(0, limit);
      }
      connections = [
        ...connections,
        ...this.env.connections_cache[cache_key],
      ].sort(sort_by_score).slice(0, limit);
    }
    return connections;
  }
  async get_embed_input() {
    if (typeof this._embed_input === 'string' && this._embed_input.length) return this._embed_input; // return cached (temporary) input
    let content = await this.read(); // get content from file
    if(this.excluded_lines.length){
      const content_lines = content.split("\n");
      this.excluded_lines.forEach(lines => {
        const {start, end} = lines;
        for(let i = start; i <= end; i++){
          content_lines[i] = "";
        }
      });
      content = content_lines.filter(line => line.length).join("\n");
    }
    const breadcrumbs = this.data.path.split("/").join(" > ").replace(".md", "");
    const max_tokens = this.collection.smart_embed.max_tokens; // prevent loading too much content
    this._embed_input = `${breadcrumbs}:\n${content}`.substring(0, max_tokens * 4);
    return this._embed_input;
  }
  open() { this.env.smart_connections_plugin.open_note(this.data.path); }
  get_block_by_line(line) {
    return Object.entries(this.data.blocks)
      .reduce((acc, [sub_key, range]) => {
        if(acc) return acc; // skip check if block already found
        if(range[0] <= line && range[1] >= line){
          const block = this.block_collection.get(this.key + sub_key);
          if(block.vec) return block; // return if block has vec
        }
        return acc;
      }, null)
    ;
  }
  /**
   * Checks if the source file exists in the file system.
   * @returns {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
   */
  async has_source_file() { return await this.fs.exists(this.data.path); }

  // CRUD

  /**
   * FILTER/SEARCH METHODS
   */
  /**
   * Searches for keywords within the entity's data and content.
   * @param {Object} search_filter - The search filter object.
   * @param {string[]} search_filter.keywords - An array of keywords to search for.
   * @param {string} [search_filter.type='any'] - The type of search to perform. 'any' counts all matching keywords, 'all' counts only if all keywords match.
   * @returns {Promise<number>} A promise that resolves to the number of matching keywords.
   */
  async search(search_filter = {}) {
    const { keywords, type = 'any', limit } = search_filter;
    if (!keywords || !Array.isArray(keywords)) {
      console.warn("Entity.search: keywords not set or is not an array");
      return 0;
    }
    if(limit && this.collection.search_results_ct >= limit) return 0;
    const lowercased_keywords = keywords.map(keyword => keyword.toLowerCase());
    const content = await this.read();
    const lowercased_content = content.toLowerCase();
    const lowercased_path = this.data.path.toLowerCase();

    const matching_keywords = lowercased_keywords.filter(keyword => 
      lowercased_path.includes(keyword) || lowercased_content.includes(keyword)
    );

    if (type === 'all') {
      return matching_keywords.length === lowercased_keywords.length ? matching_keywords.length : 0;
    } else {
      return matching_keywords.length;
    }
  }

  /**
   * ADAPTER METHODS
   */
  /**
   * Appends content to the end of the source file.
   * @param {string} content - The content to append to the file.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async append(content) {
    await this.source_adapter.append(content);
    await this.import();
  }

  /**
   * Updates the entire content of the source file.
   * @param {string} full_content - The new content to write to the file.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async update(full_content, opts = {}) {
    try {
      // console.log('Updating source:', this.data.path);
      await this.source_adapter.update(full_content, opts);
      await this.import(); // also queues embed
      // console.log('Update completed');
    } catch (error) {
      console.error('Error during update:', error);
      throw error;
    }
  }
  // Add these underscore methods back
  async _update(content) {
    await this.source_adapter._update(content);
  }

  /**
   * Reads the entire content of the source file.
   * @returns {Promise<string>} A promise that resolves with the content of the file.
   */
  async read(opts = {}) {
    try {
      // console.log('Reading source:', this.data.path);
      const content = await this.source_adapter.read(opts);
      // console.log('Read completed');
      return content;
    } catch (error) {
      console.error('Error during read:', error);
      throw error;
    }
  }
  async _read() {
    return await this.source_adapter._read();
  }

  /**
   * Removes the source file from the file system and deletes the entity.
   * This is different from delete() because it also removes the source file.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async remove() {
    try {
      // console.log('Removing source:', this.data.path);
      await this.source_adapter.remove();
      // console.log('Remove completed');
    } catch (error) {
      console.error('Error during remove:', error);
      throw error;
    }
  }
  async destroy() { await this.remove(); }

  /**
   * Moves the current source to a new location.
   * Handles the destination as a string (new path) or entity (block or source).
   * 
   * @param {string|Object|SmartEntity} entity_ref - The destination path or entity to move to.
   * @throws {Error} If the entity reference is invalid.
   * @returns {Promise<void>} A promise that resolves when the move operation is complete.
   */
  async move_to(entity_ref) {
    try {
      // Log moving source
      await this.source_adapter.move_to(entity_ref);
      // Log move completion
    } catch (error) {
      console.error('error_during_move:', error);
      throw error;
    }
  }

  /**
   * Merges the given content into the current source.
   * Parses the content into blocks and either appends to existing blocks, replaces blocks, or replaces all content.
   * 
   * @param {string} content - The content to merge into the current source.
   * @param {Object} opts - Options object.
   * @param {string} opts.mode - The merge mode: 'append', 'replace_blocks', or 'replace_all'. Default is 'append'.
   * @returns {Promise<void>}
   */
  async merge(content, opts = {}) {
    try {
      // console.log('Merging content into source:', this.data.path);
      await this.source_adapter.merge(content, opts);
      await this.import();
      // console.log('Merge completed');
    } catch (error) {
      console.error('Error during merge:', error);
      throw error;
    }
  }
  // SUBCLASS OVERRIDES
  async save() {
    if(this.deleted) return await super.save();
    const blocks_to_save = this.blocks.filter(block => block._queue_save);
    const ajson = [
      super.ajson,
      ...blocks_to_save.map(block => block.ajson).filter(ajson => ajson),
    ].join("\n");
    await super.save(ajson);
    blocks_to_save.forEach(block => block._queue_save = false);
  }
  on_load_error(err){
    super.on_load_error(err);
    // if ENOENT
    if(err.code === "ENOENT"){
      this._queue_load = false; // don't queue load again (re-queued by CollectionItem)
      this.queue_import();
    }
  }

  // GETTERS
  get block_collection() { return this.env.smart_blocks; }
  get block_vecs() { return this.blocks.map(block => block.vec).filter(vec => vec); } // filter out blocks without vec
  get blocks() {
    if(this.data.blocks) return this.block_collection.get_many(Object.keys(this.data.blocks).map(key => this.key + key)); // fastest (no iterating over all blocks)
    else if(this.last_history) return this.block_collection.get_many(Object.keys(this.last_history.blocks)); // TEMP: for backwards compatibility (2024-09-30)
    else return this.block_collection.filter({key_starts_with: this.key});
  }
  /**
   * @deprecated only for backwards compatibility in this.blocks (2024-09-30)
   */
  get last_history() { return this.data.history?.length ? this.data.history[this.data.history.length - 1] : null; }
  get data_path() { return this.collection.data_dir + "/" + this.multi_ajson_file_name + '.ajson'; }
  get data_file() { return this.data_fs.files[this.data_path]; }
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }
  get excluded() { return this.fs.is_excluded(this.data.path); }
  get excluded_lines() {
    return this.blocks.filter(block => block.excluded).map(block => block.lines);
  }
  get file() { return this.fs.files[this.path]; }
  get file_path() { return this.path; }
  get file_type() { return this.file_path.split(".").pop().toLowerCase(); }
  get fs() { return this.collection.fs; }
  get inlinks() { return Object.keys(this.env.links?.[this.data.path] || {}); }
  get is_canvas() { return this.path.endsWith("canvas"); }
  get is_excalidraw() { return this.path.endsWith("excalidraw.md"); }
  get is_gone() { return !this.file; }
  get meta_changed() {
    try {
      if(!this.file) return true;
      if (!this.mtime || this.mtime < this.file.stat.mtime) {
        if(!this.size) return true;
        const size_diff = Math.abs(this.size - this.file.stat.size);
        const size_diff_ratio = size_diff / (this.size || 1);
        if (size_diff_ratio > 0.01) return true; // if size diff greater than 1% of this.data.size, assume file changed
        // else console.log(`Smart Connections: Considering change of <1% (${size_diff_ratio * 100}%) "unchanged" for ${this.data.path}`);
      }
      return false;
    } catch (e) {
      console.warn("error getting meta changed for ", this.data.path, ": ", e);
      return true;
    }
  }
  get mtime() { return this.data.mtime || 0; }
  get multi_ajson_file_name() { return (this.path.split("#").shift()).replace(/[\s\/\.]/g, '_').replace(".md", ""); }
  get name() {
    if(this.should_show_full_path) return this.data.path.split("/").join(" > ").replace(".md", "");
    return this.data.path.split("/").pop().replace(".md", "");
  }
  get outlink_paths() {
    return (this.data.outlinks || [])
      .filter(link => !link.target.startsWith("http"))
      .map(link => {
        const link_path = this.fs.get_link_target_path(link.target, this.file_path);
        return link_path;
      })
      .filter(link_path => link_path);
  }
  get path() { return this.data.path; }
  get size() { return this.data.size || 0; }
  get smart_change_adapter() { return this.env.settings.is_obsidian_vault ? "obsidian_markdown" : "markdown"; }
  get source_adapters() { return this.collection.source_adapters; }
  get source_adapter() {
    if(this._source_adapter) return this._source_adapter;
    if(this.source_adapters[this.file_type]) this._source_adapter = new this.source_adapters[this.file_type](this);
    else this._source_adapter = new this.source_adapters["default"](this);
    return this._source_adapter;
  }

  // currently unused, but useful for later
  get mean_block_vec() { return this._mean_block_vec ? this._mean_block_vec : this._mean_block_vec = this.block_vecs.reduce((acc, vec) => acc.map((val, i) => val + vec[i]), Array(384).fill(0)).map(val => val / this.block_vecs.length); }
  get median_block_vec() {
    if (this._median_block_vec) return this._median_block_vec;
    if (!this.block_vecs.length) return null;

    const vec_length = this.block_vecs[0].length;
    this._median_block_vec = new Array(vec_length);
    const mid = Math.floor(this.block_vecs.length / 2);

    for (let i = 0; i < vec_length; i++) {
      const values = this.block_vecs.map(vec => vec[i]).sort((a, b) => a - b);
      this._median_block_vec[i] = this.block_vecs.length % 2 !== 0
        ? values[mid]
        : (values[mid - 1] + values[mid]) / 2;
    }

    return this._median_block_vec;
  }

  // DEPRECATED methods
  /**
   * @deprecated Use this.read() instead
   */
  async get_content() { return await this.read(); }
  /**
   * @deprecated Use this.file instead
   */
  get t_file() {
    return this.fs.files[this.data.path];
  } 


}