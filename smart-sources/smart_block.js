import { SmartEntity } from "smart-entities";

export class SmartBlock extends SmartEntity {
  static get defaults() {
    return {
      data: {
        text: null,
        length: 0,
      },
      _embed_input: '', // stored temporarily
    };
  }

  get block_adapters() { return this.collection.block_adapters; }
  get block_adapter() {
    if(this._block_adapter) return this._block_adapter;
    if(this.block_adapters[this.file_type]) this._block_adapter = new this.block_adapters[this.file_type](this);
    else this._block_adapter = new this.block_adapters["default"](this);
    return this._block_adapter;
  }
  get file_type() { return this.source.file_type; }

  /**
   * Queues the block for saving via the source.
   */
  queue_save() {
    this._queue_save = true;
    this.source?.queue_save();
  }

  update_data(data) {
    if (this.should_clear_embeddings(data)) this.data.embeddings = {};
    if (!this.vec) this._embed_input += data.text; // store text for embedding
    delete data.text; // clear data.text to prevent saving text
    super.update_data(data);
    return true;
  }

  should_clear_embeddings(data) {
    if(this.is_new) return true;
    if(this.embed_model_key !== "None" && this.vec?.length !== this.embed_model.dims) return true;
    if(this.data.length !== data.length) return true;
    return false;
  }

  init() {
    super.init();
    if(!this.vec) this.queue_embed();
  }

  async get_content() { return (await this.read()) || "BLOCK NOT FOUND"; }
  // async get_content() {
  //   if (!this.source) return null;
  //   try {
  //     if (this.has_lines) { // prevents full parsing of note if not needed
  //       const all_lines = await this.source.get_content();
  //       const block_content = all_lines.split("\n").slice(this.line_start, this.line_end + 1).join("\n");
  //       return block_content;
  //     }
  //     const block_content = await this.smart_chunks.get_block_from_path(this.data.path, this.source);
  //     return block_content;
  //   } catch (e) {
  //     console.log("error getting block content for ", this.data.path, ": ", e);
  //     return "BLOCK NOT FOUND";
  //   }
  // }

  async get_embed_input() {
    if (typeof this._embed_input === 'string' && this._embed_input.length) return this._embed_input; // return cached (temporary) input
    this._embed_input = this.breadcrumbs + "\n" + (await this.get_content());
    return this._embed_input;
  }

  async get_next_k_shot(i) {
    if (!this.next_block) return null;
    const current = await this.get_content();
    const next = await this.next_block.get_content();
    return `---BEGIN CURRENT ${i}---\n${current}\n---END CURRENT ${i}---\n---BEGIN NEXT ${i}---\n${next}\n---END NEXT ${i}---\n`;
  }

  get path() { return this.data.path; }
  get breadcrumbs() { return this.data.path.split("/").join(" > ").split("#").join(" > ").replace(".md", ""); }
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }
  get lines() { return { start: this.data.lines[0], end: this.data.lines[1] }; };
  get has_lines() { return this.data.lines && this.data.lines.length === 2; }
  get folder() { return this.data.path.split("/").slice(0, -1).join("/"); }
  get is_block() { return this.data.path.includes("#"); }
  get is_gone() {
    if (!this.source?.file) return true; // gone if missing entity or file
    if (!this.source.last_history?.blocks?.[this.key]) return true;
    return false;
  }
  // use text length to detect changes
  get name() {
    const source_name = this.source.name;
    const block_path_parts = this.data.path.split("#").slice(1);
    if(this.should_show_full_path) return [source_name, ...block_path_parts].join(" > ");
    return [source_name, block_path_parts.pop()].join(" > ");
  }
  // uses data.lines to get next block
  get next_block() {
    if (!this.data.lines) return null;
    const next_line = this.data.lines[1] + 1;
    return this.source.blocks?.find(block => next_line === block.data?.lines?.[0]);
  }
  get line_start() { return this.data.lines[0]; }
  get line_end() { return this.data.lines[1]; }
  get source() { return this.env.smart_sources.get(this.source_key); }
  get source_key() { return this.data.path.split("#")[0]; }
  get size() { return this.data.length; }
  get is_unembedded() {
    if(this.excluded) return false;
    return super.is_unembedded;
  }
  get excluded() {
    const block_headings = this.path.split("#").slice(1); // remove first element (file path)
    return this.env.excluded_headings.some(heading => block_headings.includes(heading));
  }

  // CRUD
  async read(opts = {}) {
    return await this.block_adapter.read(opts);
  }

  async append(append_content) {
    await this.block_adapter.append(append_content);
  }

  async update(new_block_content, opts = {}) {
    await this.block_adapter.update(new_block_content, opts);
  }

  async remove() {
    await this.block_adapter.remove();
  }

  async move_to(to_key) {
    try {
      await this.block_adapter.move_to(to_key);
    } catch (error) {
      console.error('error_during_block_move:', error);
      throw error;
    }
  }

  get sub_blocks() {
    return this.source.blocks.filter(block => this.key !== block.key && block.key.startsWith(this.key));
  }

  // DEPRECATED since v2
  get note() { return this.source; }
  get note_key() { return this.data.path.split("#")[0]; }
  // backwards compatibility (DEPRECATED)
  get link() { return this.data.path; }
}


