import { SmartEntity } from "smart-entities";
import { compute_centroid, compute_medoid } from "smart-utils/geom.js";
import { find_connections } from "./actions/find_connections.js";

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
        last_read: {
          hash: null,
          mtime: 0,
        },
        embeddings: {},
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
      // await this.data_adapter.load_item_if_updated(this);
      await this.source_adapter?.import();
      this.emit_event('sources:imported');
    }catch(err){
      if(err.code === "ENOENT"){
        console.log(`Smart Connections: Deleting ${this.path} data because it no longer exists on disk`);
        this.delete();
      } else {
        console.warn("Smart Connections: Error during import: re-queueing import", err);
        this.queue_import();
      }
    }
  }
  /**
   * @deprecated likely extraneous
   */
  async parse_content(content=null){
    // // 1) parse blocks (DEPRECATED handling: should be moved to content_parsers)
    // if(this.block_collection && typeof this.block_collection.import_source === 'function') {
    //   await this.block_collection.import_source(this, content);
    // }
    // 3) call each function in env.opts.collections.smart.sources.content_parsers
    const parse_fns = this.env?.opts?.collections?.smart_sources?.content_parsers || [];
    for(const fn of parse_fns) {
      await fn(this, content);
    }
    if(this.data.last_import?.hash === this.data.last_read?.hash){
      if(this.data.blocks) return; // if blocks already exist, skip re-import
    }
  }

  /**
   * Finds connections relevant to this SmartSource based on provided parameters.
   * @async
   * @deprecated use ConnectionsLists
   * @param {Object} [params={}] - Parameters for finding connections.
   * @param {boolean} [params.exclude_blocks_from_source_connections=false] - Whether to exclude block connections from source connections.
   * @param {Object} [params.exclude_frontmatter_blocks=true] - Whether to exclude frontmatter blocks from source connections.
   * @returns {Array<SmartSource>} An array of relevant SmartSource entities.
   */
  async find_connections(params={}) {
    return await this.actions.find_connections(params);
  }

  /**
   * Prepares the embed input for the SmartSource by reading content and applying exclusions.
   * @async
   * @returns {Promise<string|false>} The embed input string or `false` if already embedded.
   */
  async get_embed_input(content=null) {
    if (typeof this._embed_input === 'string' && this._embed_input.length) return this._embed_input; // Return cached (temporary) input
    if(!content) content = await this.read(); // Get content from file
    if(!content) {
      console.warn("SmartSource.get_embed_input: No content available for embedding: " + this.path);
      return ''; // No content to embed
    }
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
    const max_tokens = this.collection.embed_model.model.data.max_tokens || 500; // Prevent loading too much content
    const max_chars = Math.floor(max_tokens * 3.7); // more conservative estimate for characters
    this._embed_input = `${breadcrumbs}:\n${content}`.substring(0, max_chars);
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
    if(!content || typeof content !== 'string' || !content.length) {
      if(content.mime_type) {
        console.warn(`Entity.search: No content available for searching: ${this.path}, mime_type: ${content.mime_type}`);
      }else{
        console.warn(`Entity.search: No content available for searching: ${this.path}, content: ${content ? JSON.stringify(content) : 'empty'}`);
      }
      return 0;
    }
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
  use_source_adapter(method, ...args) {
    if(!this.source_adapter){
      console.warn(`No source adapter available for ${this.key}. Cannot use method ${method}.`);
      return;
    }
    if(typeof this.source_adapter[method] !== 'function') {
      console.warn(`Source adapter for ${this.key} does not implement method ${method}.`);
      return;
    }
    return this.source_adapter[method](...args);
  }
  /**
   * Appends content to the end of the source file.
   * @async
   * @param {string} content - The content to append to the file.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async append(content) {
    // await this.source_adapter.append(content);
    await this.use_source_adapter('append', content);
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
      // await this.source_adapter.update(full_content, opts);
      await this.use_source_adapter('update', full_content, opts);
      await this.import(); // Also queues embed
    } catch (error) {
      console.error(`Error during update for ${this.key}:`, error);
      // throw error;
    }
  }

  /**
   * Reads the entire content of the source file.
   * @async
   * @param {Object} [opts={}] - Additional options for reading.
   * @returns {Promise<string>} A promise that resolves with the content of the file.
   */
  async read(opts = {}) {
    try {
      // return await this.source_adapter.read(opts) || '';
      return await this.use_source_adapter('read', opts) || '';
    } catch (error) {
      console.error(`Error during reading ${this.key} (returning empty string)`, error);
      return '';
    }
  }

  /**
   * Removes the source file from the file system and deletes the entity.
   * This is different from `delete()` because it also removes the source file.
   * @async
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async remove() {
    try {
      // await this.source_adapter.remove();
      await this.use_source_adapter('remove');
    } catch (error) {
      console.error(`Error during remove for ${this.key}:`, error);
      // throw error;
    }
  }

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
      // await this.source_adapter.move_to(entity_ref);
      await this.use_source_adapter('move_to', entity_ref);
    } catch (error) {
      console.error(`Error during move for ${this.key}:`, error);
      // throw error;
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
      // await this.source_adapter.merge(content, opts);
      await this.use_source_adapter('merge', content, opts);
      await this.import();
    } catch (error) {
      console.error(`Error during merge for ${this.key}:`, error);
      // throw error;
    }
  }

  /**
   * Handles errors during the load process.
   * @param {Error} err - The error encountered during load.
   * @returns {void}
   */
  on_load_error(err){
    super.on_load_error(err);
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
  get block_vecs() { return this.blocks.map(block => block.vec).filter(vec => vec); }

  /**
   * Retrieves all blocks associated with the SmartSource.
   * @readonly
   * @returns {Array<SmartBlock>} An array of SmartBlock instances.
   * @description
   * Uses block refs (Fastest) to get blocks without iterating over all blocks
   */
  get blocks() {
    if(this.data.blocks) return this.block_collection.get_many(Object.keys(this.data.blocks).map(key => this.key + key));
    return [];
  }

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
   * Retrieves the file system instance from the SmartSource's collection.
   * @readonly
   * @returns {SmartFS} The file system instance.
   */
  get fs() { return this.collection.fs; }

  /**
   * Retrieves the file object associated with the SmartSource.
   * @deprecated should be replaced with adapter methods
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
  get file_type() {
    if (!this._ext) {
      this._ext = this.collection.get_extension_for_path(this.path) || 'md'; 
    }
    return this._ext;
  }

  /**
   * Retrieves the modification time of the SmartSource.
   * @deprecated should be replaced with adapter methods (see get size)
   * @readonly
   * @returns {number} The modification time.
   */
  get mtime() { return this.file?.stat?.mtime || 0; }

  /**
   * Retrieves the size of the SmartSource.
   * @readonly
   * @returns {number} The size.
   */
  get size() { return this.source_adapter?.size || 0; }

  /**
   * Retrieves the last import stat of the SmartSource.
   * @readonly
   * @returns {Object} The last import stat.
   */
  get last_import() { return this.data?.last_import; }

  /**
   * Retrieves the last import modification time of the SmartSource.
   * @readonly
   * @returns {number} The last import modification time.
   */
  get last_import_mtime() { return this.last_import?.mtime || 0; }

  /**
   * Retrieves the last import size of the SmartSource.
   * @readonly
   * @returns {number} The last import size.
   */
  get last_import_size() { return this.last_import?.size || 0; }

  /**
   * Retrieves the paths of inlinks to this SmartSource.
   * @readonly
   * @returns {Array<string>} An array of inlink paths.
   */
  get inlinks() { return Object.keys(this.collection.links?.[this.path] || {}); }


  get is_media() { return this.source_adapter.is_media || false; }

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
  get last_read() { return this.data.last_read; }

  get metadata() { return this.data.metadata; }

  get outdated() { return this.source_adapter.outdated; }
  /**
   * Retrieves the outlink paths from the SmartSource.
   * @readonly
   * @returns {Array<string>} An array of outlink paths.
   */
  get outlinks() {
    return (this.data.outlinks || [])
      .map(link => {
        const link_ref = link?.target || link;
        if(typeof link_ref !== 'string') return null;
        if(link_ref.startsWith("http")) return null;
        const link_path = this.fs.get_link_target_path(link_ref, this.file_path);
        return {
          key: link_path,
          embedded: link.embedded || false,
        };
      })
      .filter(link_path => link_path);
  }

  /**
   * @deprecated path should be derived from key (stable key principle)
   */
  get path() { return this.data.path || this.data.key; }
  get source_adapters() { return this.collection.source_adapters; }
  get source_adapter() {
    if(this._source_adapter) return this._source_adapter;
    if(this.source_adapters[this.file_type]) this._source_adapter = new this.source_adapters[this.file_type](this);
    else {
      // console.log("No source adapter found for " + this.file_type);
      for(const Adapter of Object.values(this.source_adapters)) {
        if (typeof Adapter.detect_type !== 'function') continue;
        if (Adapter.detect_type(this)) {
          this._source_adapter = new Adapter(this);
          break;
        }
      }
    }
    return this._source_adapter;
  }


  // COMPONENTS
  /**
   * Calculates the mean vector of all blocks within the SmartSource.
   * @readonly
   * @returns {Array<number>|null} The mean vector or `null` if no vectors are present.
   */
  get mean_block_vec() {
    if (this._mean_block_vec){
      this._mean_block_vec = compute_centroid(this.block_vecs);
    }
    return this._mean_block_vec;
  }


  /**
   * Calculates the median vector of all blocks within the SmartSource.
   * @readonly
   * @returns {Array<number>|null} The median vector or `null` if no vectors are present.
   */
  get median_block_vec() {
    if (this._median_block_vec){
      this._median_block_vec = compute_medoid(this.block_vecs);
    }
    return this._median_block_vec;
  }


  // DEPRECATED methods
  /**
   * @async
   * @deprecated Use `read` instead.
   * @returns {Promise<string>} A promise that resolves with the content of the file.
   */
  async _read() {
    return await this.source_adapter._read();
  }

  /**
   * @async
   * @deprecated Use `remove` instead.
   * @returns {Promise<void>} A promise that resolves when the entity is destroyed.
   */
  async destroy() { await this.remove(); }

  /**
   * @async
   * @deprecated Use `update` instead.
   * @param {string} content - The content to update.
   * @returns {Promise<void>}
   */
  async _update(content) {
    await this.source_adapter.update(content);
  }

  /**
   * @deprecated Use `source` instead.
   * @readonly
   * @returns {SmartSource} The associated SmartSource instance.
   */
  get t_file() {
    return this.fs.files[this.path];
  }

}

export default {
  class: SmartSource,
  actions: {
    find_connections: find_connections,
  },
}
