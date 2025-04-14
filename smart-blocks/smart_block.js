import { SmartEntity } from "smart-entities";
// import { render as render_source_component } from "./components/source.js";
import { create_hash } from "smart-sources/utils/create_hash.js";

/**
 * @class SmartBlock
 * @extends SmartEntity
 * @classdesc Represents a single block within a SmartSource, handling content parsing, embedding, and CRUD operations specific to blocks.
 */
export class SmartBlock extends SmartEntity {
  /**
   * Provides default values for a SmartBlock instance.
   * @static
   * @readonly
   * @returns {Object} The default values.
   */
  static get defaults() {
    return {
      data: {
        text: null,
        length: 0,
        last_read: {
          hash: null,
          at: 0,
        },
      },
      _embed_input: '', // Stored temporarily
    };
  }
  get block_adapter() {
    if(!this._block_adapter){
      // this._block_adapter = new this.collection.opts.block_adapters[this.file_type](this);
      this._block_adapter = new this.collection.opts.block_adapters.md(this);
    }
    return this._block_adapter;
  }

  /**
   * Initializes the SmartBlock instance by queuing an embed if embedding is enabled.
   * @returns {void}
   */
  init() {
    if(this.settings.embed_blocks) super.init(); // Queues embed; prunes embeddings for other models
    // Else: Do nothing (may prune embeddings to save memory in future)
  }

  /**
   * Queues the entity for embedding.
   * @returns {void}
   */
  queue_embed() {
    this._queue_embed = true;
    this.source?.queue_embed();
  }

  /**
   * Queues the block for import via the source.
   * @returns {void}
   */
  queue_import(){
    this.source?.queue_import();
  }

  /**
   * Updates the block's data, clearing embeddings if necessary and preparing embed input.
   * @param {Object} data - The new data to merge into the block.
   * @returns {boolean} `true` if data was updated successfully.
   */
  update_data(data) {
    if (this.should_clear_embeddings(data)){
      this.data.embeddings = {};
    }
    super.update_data(data);
    return true;
  }

  /**
   * Determines whether to clear embeddings based on the new data.
   * @param {Object} data - The new data to evaluate.
   * @returns {boolean} `true` if embeddings should be cleared, `false` otherwise.
   */
  should_clear_embeddings(data) {
    if(this.is_new) return true;
    if(this.embed_model && this.vec?.length !== this.embed_model.model_config.dims) return true;
    return false;
  }

  /**
   * Prepares the embed input for the SmartBlock by reading content and generating a hash.
   * @async
   * @returns {Promise<string|false>} The embed input string or `false` if already embedded.
   */
  async get_embed_input(content=null) {
    if(typeof this._embed_input !== "string" || !this._embed_input.length){
      if(!content) content = await this.read();
      this._embed_input = this.breadcrumbs + "\n" + content;
    }
    return this._embed_input;
  }

  // CRUD
  /**
   * @method read
   * @description Reads the block content by delegating to the block adapter.
   * @async
   * @returns {Promise<string>} The block content.
   */
  async read() {
    try{
      return await this.block_adapter.read();
    } catch (e) {
      if(e.message.includes('BLOCK NOT FOUND')){
        return "BLOCK NOT FOUND (run \"Prune\" to remove)";
      } else {
        throw e;
      }
    }
  }

  /**
   * @method append
   * @description Appends content to this block by delegating to the block adapter.
   * @async
   * @param {string} content
   * @returns {Promise<void>}
   */
  async append(content) {
    await this.block_adapter.append(content);
    this.queue_save();
  }

  /**
   * @method update
   * @description Updates the block content by delegating to the block adapter.
   * @async
   * @param {string} new_block_content
   * @param {Object} [opts={}]
   * @returns {Promise<void>}
   */
  async update(new_block_content, opts={}) {
    await this.block_adapter.update(new_block_content, opts);
    this.queue_save();
  }

  /**
   * @method remove
   * @description Removes the block by delegating to the block adapter.
   * @async
   * @returns {Promise<void>}
   */
  async remove() {
    await this.block_adapter.remove();
    this.queue_save();
  }

  /**
   * @method move_to
   * @description Moves the block to another location by delegating to the block adapter.
   * @async
   * @param {string} to_key
   * @returns {Promise<void>}
   */
  async move_to(to_key) {
    await this.block_adapter.move_to(to_key);
    this.queue_save();
  }


  // Getters

  /**
   * Retrieves the breadcrumbs representing the block's path within the source.
   * @readonly
   * @returns {string} The breadcrumbs string.
   */
  get breadcrumbs() {
    return this.key
      .split("/")
      .join(" > ")
      .split("#")
      .slice(0, -1) // Remove last element (contained in content)
      .join(" > ")
      .replace(".md", "")
    ;
  }

  /**
   * Determines if the block is excluded from embedding based on headings.
   * @readonly
   * @returns {boolean} `true` if excluded, `false` otherwise.
   */
  get excluded() {
    const block_headings = this.path.split("#").slice(1); // Remove first element (file path)
    if(this.source_collection.excluded_headings.some(heading => block_headings.includes(heading))) return true;
    return this.source.excluded;
  }

  /**
   * Retrieves the file path of the SmartSource associated with the block.
   * @readonly
   * @returns {string} The file path.
   */
  get file_path() { return this.source?.file_path; }

  /**
   * Retrieves the file type of the SmartSource associated with the block.
   * @readonly
   * @returns {string} The file type.
   */
  get file_type() { return this.source.file_type; }

  /**
   * Retrieves the folder path of the block.
   * @readonly
   * @returns {string} The folder path.
   */
  get folder() { return this.path.split("/").slice(0, -1).join("/"); }

  /**
   * Retrieves the embed link for the block.
   * @readonly
   * @returns {string} The embed link.
   */
  get embed_link() {
    return `![[${this.link}]]`;
  }

  /**
   * Determines if the block has valid line range information.
   * @readonly
   * @returns {boolean} `true` if the block has both start and end lines, `false` otherwise.
   */
  get has_lines() { return this.lines && this.lines.length === 2; }

  /**
   * Determines if the entity is a block based on its key.
   * @readonly
   * @returns {boolean} `true` if it's a block, `false` otherwise.
   */
  get is_block() { return this.key.includes("#"); }

  /**
   * Determines if the block is gone (i.e., the source file or block data no longer exists).
   * @readonly
   * @returns {boolean} `true` if gone, `false` otherwise.
   */
  get is_gone() {
    if (!this.source?.file) return true; // Gone if missing entity or file
    if (!this.source?.data?.blocks?.[this.sub_key]) return true;
    return false;
  }

  get last_read() { return this.data.last_read; }
  
  /**
   * Retrieves the sub-key of the block.
   * @readonly
   * @returns {string} The sub-key.
   */
  get sub_key() { return "#" + this.key.split("#").slice(1).join("#"); }

  /**
   * Retrieves the lines range of the block.
   * @readonly
   * @returns {Array<number>|undefined} An array containing the start and end lines or `undefined` if not set.
   */
  // get lines() { return this.source?.data?.blocks?.[this.sub_key]; }
  get lines() { return this.data.lines; }

  /**
   * Retrieves the starting line number of the block.
   * @readonly
   * @returns {number|undefined} The starting line number or `undefined` if not set.
   */
  get line_start() { return this.lines?.[0]; }

  /**
   * Retrieves the ending line number of the block.
   * @readonly
   * @returns {number|undefined} The ending line number or `undefined` if not set.
   */
  get line_end() { return this.lines?.[1]; }

  /**
   * Retrieves the link associated with the block, handling page numbers if present.
   * @readonly
   * @returns {string} The block link.
   */
  get link() {
    // If regex matches "page #" (case-insensitive), return page number
    if(/^.*page\s*(\d+).*$/i.test(this.sub_key)){
      const number = this.sub_key.match(/^.*page\s*(\d+).*$/i)[1];
      return `${this.source.path}#page=${number}`;
    }else{
      return this.source?.path || "MISSING SOURCE";
    }
  }

  /**
   * Retrieves the display name of the block.
   * @readonly
   * @returns {string} The display name.
   */
  get name() {
    const source_name = this.source?.name;
    if(!source_name) return "MISSING SOURCE";
    const block_path_parts = this.key.split("#").slice(1);
    if(this.should_show_full_path) return [source_name, ...block_path_parts].join(" > ");
    if(block_path_parts[block_path_parts.length-1][0] === "{") block_path_parts.pop(); // Remove block index
    return [source_name, block_path_parts.pop()].join(" > ");
  }
  // uses data.lines to get next block
  get next_block() {
    if (!this.data.lines) return null;
    const next_line = this.data.lines[1] + 1;
    return this.source.blocks?.find(block => next_line === block.data?.lines?.[0]);
  }

  /**
   * Retrieves the paths of outlinks from the block.
   * @readonly
   * @returns {Array<string>} An array of outlink paths.
   */
  get outlinks() { return this.source.outlinks; }

  /**
   * Retrieves the path of the SmartBlock.
   * @readonly
   * @returns {string} The path of the SmartBlock.
   */
  get path() { return this.key; }

  /**
   * Determines if the block should be embedded based on its coverage and size.
   * @readonly
   * @returns {boolean} `true` if it should be embedded, `false` otherwise.
   */
  get should_embed() {
    try{
      if(this.settings?.min_chars && this.size < this.settings.min_chars) return false;
      const match_line_start = this.line_start + 1;
      const match_line_end = this.line_end;
      // check if sub-blocks should be embedded individually
      const { has_line_start, has_line_end } = Object.entries(this.source?.data?.blocks || {})
        .reduce((acc, [key, range]) => {
          if(!key.startsWith(this.sub_key+"#")) return acc;
          if(range[0] === match_line_start) acc.has_line_start = key;
          if(range[1] === match_line_end) acc.has_line_end = key;
          return acc;
        }, {has_line_start: null, has_line_end: null});
      if (has_line_start && has_line_end){
        // Ensure start and end blocks are large enough to embed before skipping embedding for this block
        const start_block = this.collection.get(this.source_key + has_line_start);
        if(start_block?.should_embed){
          const end_block = this.collection.get(this.source_key + has_line_end);
          if(end_block?.should_embed) return false;
        }
      }
      return true;
    }catch(e){
      console.error(e, e.stack);
      console.error(`Error getting should_embed for ${this.key}: ` + JSON.stringify((e || {}), null, 2));
    }
  }

  /**
   * Retrieves the size of the SmartBlock.
   * @readonly
   * @returns {number} The size of the SmartBlock.
   */
  get size() { return this.data.size; }

  /**
   * Retrieves the SmartSource associated with the block.
   * @readonly
   * @returns {SmartSource} The associated SmartSource instance.
   */
  get source() { return this.source_collection.get(this.source_key); }

  /**
   * Retrieves the SmartSources collection instance.
   * @readonly
   * @returns {SmartSources} The SmartSources collection.
   */
  get source_collection() { return this.env.smart_sources; }
  get source_key() { return this.key.split("#")[0]; }
  get sub_blocks() {
    return this.source?.blocks?.filter(block => block.key.startsWith(this.key+"#") && block.line_start > this.line_start && block.line_end <= this.line_end) || [];
  }

  // source dependent
  get excluded_lines() { return this.source.excluded_lines; }
  get file() { return this.source.file; }
  get is_media() { return this.source.is_media; }
  get mtime() { return this.source.mtime; }
  

  // DEPRECATED
  /**
   * @deprecated Use `source` instead.
   * @readonly
   * @returns {SmartSource} The associated SmartSource instance.
   */
  get note() { return this.source; }

  /**
   * @deprecated Use `source.key` instead.
   * @readonly
   * @returns {string} The source key.
   */
  get note_key() { return this.key.split("#")[0]; }
}

import { find_connections } from "smart-entities/actions/find_connections.js";
export default {
  class: SmartBlock,
  actions: {
    find_connections: find_connections,
  },
}
