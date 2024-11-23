import { SmartEntity } from "smart-entities";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";
import { render as render_source_component } from "./components/source.js";
import { create_hash } from "./utils/create_hash.js";

/**
 * @class SmartSource
 * @extends SmartEntity
 * @classdesc Represents a single source within SmartSources, handling content parsing, embedding, and CRUD operations.
 */
export class SmartSource extends SmartEntity {
  /**
   * Provides default values for a SmartSource instance.
   * @static
   * @readonly
   * @returns {Object} The default values.
   */
  static get defaults() {
    return {
      data: {
        history: [], // Array of { mtime, hash, length, blocks[] }
      },
      _embed_input: null, // Stored temporarily
      _queue_load: true,
    };
  }

  /**
   * Initializes the SmartSource instance by queuing an import if blocks are missing.
   * @returns {void}
   */
  init() {
    super.init();
    if(!this.data.blocks) this.queue_import();
  }

  /**
   * Queues the SmartSource for import.
   * @returns {void}
   */
  queue_import() { this._queue_import = true; }

  /**
   * Imports the SmartSource by checking for updates and parsing content.
   * @async
   * @returns {Promise<void>}
   */
  async import(){
    this._queue_import = false;
    try{
      if(this.file_type === 'md' && this.file.stat.size > 1000000) {
        console.log(`Smart Connections: Skipping large file: ${this.path}`);
        return;
      }
      // Must check exists using async because not always reflects by file.stat (e.g., Obsidian)
      if((await this.data_fs.exists(this.data_path))){
        // Check if file has been updated on disk
        if(this.loaded_at && (this.env.fs.files[this.data_path] && this.env.fs.files[this.data_path].mtime > (this.loaded_at + 1 * 60 * 1000))){
          console.log(`Smart Connections: Re-loading data source for ${this.path} because it has been updated on disk`);
          return await this.load();
        }
      }
      if(this.meta_changed){
        this.data.blocks = null;
        await this.save(super.ajson);
        this.data.mtime = this.file.stat.mtime;
        this.data.size = this.file.stat.size;
        await this.source_adapter.import();
        this.loaded_at = Date.now(); // Reset loaded_at to now to prevent unneeded reloads
        this.queue_embed();
      } // else console.log(`Smart Connections: No changes to ${this.path}`);
    }catch(err){
      this.queue_import();
      console.error(err, err.stack);
    }
  }

  /**
   * Finds connections relevant to this SmartSource based on provided parameters.
   * @param {Object} [params={}] - Parameters for finding connections.
   * @param {boolean} [params.exclude_source_connections=false] - Whether to exclude source connections.
   * @param {boolean} [params.exclude_blocks_from_source_connections=false] - Whether to exclude block connections from source connections.
   * @returns {Array<SmartSource>} An array of relevant SmartSource entities.
   */
  find_connections(params={}) {
    let connections;
    if(this.block_collection.settings.embed_blocks && params.exclude_source_connections) connections = [];
    else connections = super.find_connections(params);
    const filter_opts = this.prepare_find_connections_filter_opts(params);
    const limit = params.filter?.limit
      || params.limit // DEPRECATED: for backwards compatibility
      || this.env.settings.smart_view_filter?.results_limit
      || 20
    ;
    if(params.filter?.limit) delete params.filter.limit; // Remove to prevent limiting in initial filter (limit should happen after nearest for lookup)
    if(params.limit) delete params.limit; // Backwards compatibility
    if(!params.exclude_blocks_from_source_connections) {
      const cache_key = this.key + JSON.stringify(params) + "_blocks";
      if(!this.env.connections_cache) this.env.connections_cache = {};
      if(!this.env.connections_cache[cache_key]){
        const nearest = this.env.smart_blocks.nearest(this.vec, filter_opts)
          .sort(sort_by_score)
          .slice(0, limit)
        ;
        this.connections_to_cache(cache_key, nearest);
      }
      connections = [
        ...connections,
        ...this.connections_from_cache(cache_key),
      ].sort(sort_by_score).slice(0, limit);
    }
    return connections;
  }

  /**
   * Prepares the embed input for the SmartSource by reading content and applying exclusions.
   * @async
   * @returns {Promise<string|false>} The embed input string or `false` if already embedded.
   */
  async get_embed_input() {
    if (typeof this._embed_input === 'string' && this._embed_input.length) return this._embed_input; // Return cached (temporary) input
    let content = await this.read(); // Get content from file
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
    const breadcrumbs = this.path.split("/").join(" > ").replace(".md", "");
    const max_tokens = this.collection.embed_model.model_config.max_tokens || 500; // Prevent loading too much content
    this._embed_input = `${breadcrumbs}:\n${content}`.substring(0, max_tokens * 4);
    return this._embed_input;
  }

  /**
   * Opens the SmartSource note in the SmartConnections plugin.
   * @returns {void}
   */
  open() { this.env.smart_connections_plugin.open_note(this.path); }

  /**
   * Retrieves the block associated with a specific line number.
   * @param {number} line - The line number to search for.
   * @returns {SmartBlock|null} The corresponding SmartBlock or `null` if not found.
   */
  get_block_by_line(line) {
    return Object.entries(this.data.blocks || {})
      .reduce((acc, [sub_key, range]) => {
        if(acc) return acc; // Skip check if block already found
        if(range[0] <= line && range[1] >= line){
          const block = this.block_collection.get(this.key + sub_key);
          if(block?.vec) return block; // Return if block has vec
        }
        return acc;
      }, null)
    ;
  }

  /**
   * Checks if the source file exists in the file system.
   * @async
   * @returns {Promise<boolean>} A promise that resolves to `true` if the file exists, `false` otherwise.
   */
  async has_source_file() { return await this.fs.exists(this.path); }

  // CRUD

  /**
   * FILTER/SEARCH METHODS
   */
  /**
   * Searches for keywords within the entity's data and content.
   * @async
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
    const lowercased_path = this.path.toLowerCase();

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
   * @async
   * @param {string} content - The content to append to the file.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async append(content) {
    await this.source_adapter.append(content);
    await this.import();
  }

  /**
   * Updates the entire content of the source file.
   * @async
   * @param {string} full_content - The new content to write to the file.
   * @param {Object} [opts={}] - Additional options for the update.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async update(full_content, opts = {}) {
    try {
      // console.log('Updating source:', this.path);
      await this.source_adapter.update(full_content, opts);
      await this.import(); // Also queues embed
      // console.log('Update completed');
    } catch (error) {
      console.error('Error during update:', error);
      throw error;
    }
  }

  /**
   * @async
   * @deprecated Use `update` instead.
   * @param {string} content - The content to update.
   * @returns {Promise<void>}
   */
  async _update(content) {
    await this.source_adapter._update(content);
  }

  /**
   * Reads the entire content of the source file.
   * @async
   * @param {Object} [opts={}] - Additional options for reading.
   * @returns {Promise<string>} A promise that resolves with the content of the file.
   */
  async read(opts = {}) {
    try {
      // console.log('Reading source:', this.path);
      const content = await this.source_adapter.read(opts);
      // console.log('Read completed');
      return content;
    } catch (error) {
      console.error('Error during read:', error);
      throw error;
    }
  }

  /**
   * @async
   * @deprecated Use `read` instead.
   * @returns {Promise<string>} A promise that resolves with the content of the file.
   */
  async _read() {
    return await this.source_adapter._read();
  }

  /**
   * Removes the source file from the file system and deletes the entity.
   * This is different from `delete()` because it also removes the source file.
   * @async
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async remove() {
    try {
      // console.log('Removing source:', this.path);
      await this.source_adapter.remove();
      // console.log('Remove completed');
    } catch (error) {
      console.error('Error during remove:', error);
      throw error;
    }
  }

  /**
   * @async
   * @deprecated Use `remove` instead.
   * @returns {Promise<void>} A promise that resolves when the entity is destroyed.
   */
  async destroy() { await this.remove(); }

  /**
   * Moves the current source to a new location.
   * Handles the destination as a string (new path) or entity (block or source).
   * 
   * @async
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
   * @async
   * @param {string} content - The content to merge into the current source.
   * @param {Object} [opts={}] - Options object.
   * @param {string} [opts.mode='append'] - The merge mode: 'append', 'replace_blocks', or 'replace_all'.
   * @returns {Promise<void>}
   */
  async merge(content, opts = {}) {
    try {
      await this.source_adapter.merge(content, opts);
      await this.import();
    } catch (error) {
      console.error('Error during merge:', error);
      throw error;
    }
  }

  /**
   * Saves the SmartSource and its blocks by processing the save queue.
   * @async
   * @returns {Promise<void>}
   */
  async save() {
    if(this.deleted) return await super.save(super.ajson);
    const blocks_to_save = this.blocks.filter(block => block._queue_save);
    const ajson = [
      super.ajson,
      ...blocks_to_save.map(block => block.ajson).filter(ajson => ajson),
    ].join("\n");
    await super.save(ajson);
    blocks_to_save.forEach(block => {
      block._queue_save = false;
      if(block.deleted && this.block_collection.items[block.key]){
        this.block_collection.delete_item(block.key);
      }
    });
  }

  /**
   * Handles errors during the load process.
   * @param {Error} err - The error encountered during load.
   * @returns {void}
   */
  on_load_error(err){
    super.on_load_error(err);
    // If ENOENT
    if(err.code === "ENOENT"){
      this._queue_load = false; // Don't queue load again (re-queued by CollectionItem)
      this.queue_import();
    }
  }

  // GETTERS

  /**
   * Retrieves the block collection associated with SmartSources.
   * @readonly
   * @returns {SmartBlocks} The block collection instance.
   */
  get block_collection() { return this.env.smart_blocks; }

  /**
   * Retrieves the vector representations of all blocks within the SmartSource.
   * @readonly
   * @returns {Array<Array<number>>} An array of vectors.
   */
  get block_vecs() { return this.blocks.map(block => block.vec).filter(vec => vec); } // Filter out blocks without vec

  /**
   * Retrieves all blocks associated with the SmartSource.
   * @readonly
   * @returns {Array<SmartBlock>} An array of SmartBlock instances.
   */
  get blocks() {
    if(this.data.blocks) return this.block_collection.get_many(Object.keys(this.data.blocks).map(key => this.key + key)); // Fastest (no iterating over all blocks)
    else if(this.last_history) return this.block_collection.get_many(Object.keys(this.last_history.blocks)); // TEMP: for backwards compatibility (2024-09-30)
    // else return this.block_collection.filter({key_starts_with: this.key});
    return [];
  }

  /**
   * @deprecated Only for backwards compatibility in `this.blocks` (2024-09-30).
   * @readonly
   * @returns {Object|null} The last history entry or null if none.
   */
  get last_history() { return this.data.history?.length ? this.data.history[this.data.history.length - 1] : null; }

  /**
   * Retrieves the data path for the SmartSource.
   * @readonly
   * @returns {string} The data path.
   */
  get data_path() { return this.collection.data_dir + "/" + this.multi_ajson_file_name + '.ajson'; }

  /**
   * Retrieves the data file associated with the SmartSource.
   * @readonly
   * @returns {Object} The data file object.
   */
  get data_file() { return this.data_fs.files[this.data_path]; }

  /**
   * Retrieves the embed input, either from cache or by generating it.
   * @readonly
   * @returns {string|Promise<string>} The embed input string or a promise resolving to it.
   */
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }

  /**
   * Determines if the SmartSource is excluded from processing.
   * @readonly
   * @returns {boolean} `true` if excluded, `false` otherwise.
   */
  get excluded() { return this.fs.is_excluded(this.path); }

  /**
   * Retrieves the lines excluded from embedding.
   * @readonly
   * @returns {Array<Object>} An array of objects with `start` and `end` line numbers.
   */
  get excluded_lines() {
    return this.blocks.filter(block => block.excluded).map(block => block.lines);
  }

  /**
   * Retrieves the file object associated with the SmartSource.
   * @readonly
   * @returns {Object} The file object.
   */
  get file() { return this.fs.files[this.path]; }

  /**
   * Retrieves the file name of the SmartSource.
   * @readonly
   * @returns {string} The file name.
   */
  get file_name() { return this.path.split("/").pop(); }

  /**
   * Retrieves the file path of the SmartSource.
   * @readonly
   * @returns {string} The file path.
   */
  get file_path() { return this.path; }

  /**
   * Retrieves the file type based on the file extension.
   * @readonly
   * @returns {string} The file type in lowercase.
   */
  get file_type() { return this.file_path.split(".").pop().toLowerCase(); }

  /**
   * Retrieves the file system instance from the SmartSource's collection.
   * @readonly
   * @returns {SmartFS} The file system instance.
   */
  get fs() { return this.collection.fs; }

  /**
   * Retrieves the hash of the SmartSource.
   * @readonly
   * @returns {string|undefined} The hash value or `undefined` if not set.
   */
  get hash() { return this.data?.hash; }

  /**
   * Retrieves the paths of inlinks to this SmartSource.
   * @readonly
   * @returns {Array<string>} An array of inlink paths.
   */
  get inlinks() { return Object.keys(this.env.links?.[this.path] || {}); }

  /**
   * Determines if the SmartSource is a canvas file.
   * @readonly
   * @returns {boolean} `true` if the file is a canvas, `false` otherwise.
   */
  get is_canvas() { return this.path.endsWith("canvas"); }
  
  /**
   * Determines if the SmartSource is an Excalidraw file.
   * @readonly
   * @returns {boolean} `true` if the file is Excalidraw, `false` otherwise.
   */
  get is_excalidraw() { return this.path.endsWith("excalidraw.md"); }
  
  /**
   * Determines if the SmartSource is gone (i.e., the file no longer exists).
   * @readonly
   * @returns {boolean} `true` if gone, `false` otherwise.
   */
  get is_gone() { return !this.file; }

  /**
   * Retrieves the last read hash of the SmartSource.
   * @readonly
   * @returns {string|undefined} The last read hash or `undefined` if not set.
   */
  get last_read_hash() { return this.data?.last_read_hash; }

  /**
   * Determines if the SmartSource has changed based on metadata.
   * @readonly
   * @returns {boolean} `true` if metadata has changed, `false` otherwise.
   */
  get meta_changed() {
    try {
      if(!this.file) return true;
      if(this.last_read_hash !== this.hash) return true;
      if (!this.mtime || this.mtime < this.file.stat.mtime) {
        if(!this.size) return true;
        const size_diff = Math.abs(this.size - this.file.stat.size);
        const size_diff_ratio = size_diff / (this.size || 1);
        if (size_diff_ratio > 0.01) return true; // if size diff greater than 1% of this.data.size, assume file changed
        // else console.log(`Smart Connections: Considering change of <1% (${size_diff_ratio * 100}%) "unchanged" for ${this.path}`);
      }
      return false;
    } catch (e) {
      console.warn("error getting meta changed for ", this.path, ": ", e);
      return true;
    }
  }

  /**
   * Retrieves the modification time of the SmartSource.
   * @readonly
   * @returns {number} The modification time.
   */
  get mtime() { return this.data.mtime || 0; }

  /**
   * Retrieves the multi AJSON file name derived from the path.
   * @readonly
   * @returns {string} The multi AJSON file name.
   */
  get multi_ajson_file_name() { return (this.path.split("#").shift()).replace(/[\s\/\.]/g, '_').replace(".md", ""); }

  /**
   * Retrieves the display name of the SmartSource.
   * @readonly
   * @returns {string} The display name.
   */
  get name() {
    if(this.should_show_full_path) return this.path.split("/").join(" > ").replace(".md", "");
    return this.path.split("/").pop().replace(".md", "");
  }

  /**
   * Retrieves the outlink paths from the SmartSource.
   * @readonly
   * @returns {Array<string>} An array of outlink paths.
   */
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

  // COMPONENTS

  /**
   * Retrieves the component responsible for rendering the SmartSource.
   * @readonly
   * @returns {Function} The render function for the source component.
   */
  get component() { return render_source_component; }

  // Currently unused, but useful for later

  /**
   * Calculates the mean vector of all blocks within the SmartSource.
   * @readonly
   * @returns {Array<number>|null} The mean vector or `null` if no vectors are present.
   */
  get mean_block_vec() { return this._mean_block_vec ? this._mean_block_vec : this._mean_block_vec = this.block_vecs.reduce((acc, vec) => acc.map((val, i) => val + vec[i]), Array(384).fill(0)).map(val => val / this.block_vecs.length); }

  /**
   * Calculates the median vector of all blocks within the SmartSource.
   * @readonly
   * @returns {Array<number>|null} The median vector or `null` if no vectors are present.
   */
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
   * @async
   * @deprecated Use `read` instead.
   * @returns {Promise<string>} A promise that resolves with the content of the block or "BLOCK NOT FOUND".
   */
  async get_content() { return (await this.read()) || "BLOCK NOT FOUND"; }

  /**
   * @deprecated Use `source` instead.
   * @readonly
   * @returns {SmartSource} The associated SmartSource instance.
   */
  get t_file() {
    return this.fs.files[this.path];
  } 


}