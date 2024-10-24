import { SmartEntity } from "smart-entities";
import { render as render_source_component } from "./components/source.js";
import { create_hash } from "./utils/create_hash.js";

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

  init() {
    if(this.settings.embed_blocks) super.init(); // queues embed; prunes embeddings for other models
    // else do nothing (may prune embeddings to save memory in future)
  }

  /**
   * Queues the block for saving via the source.
   */
  queue_save() {
    this._queue_save = true;
    this.source?.queue_save();
  }
  queue_import(){
    this.source?.queue_import();
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
    if(this.embed_model && this.embed_model_key !== "None" && this.vec?.length !== this.embed_model.dims) return true;
    if(this.data.length !== data.length) return true;
    return false;
  }

  async get_embed_input() {
    if(typeof this._embed_input !== "string" || !this._embed_input.length){
      this._embed_input = this.breadcrumbs + "\n" + (await this.read());
    }
    if(this.vec){
      // PREVENT EMBEDDING BASED ON HASH
      // likely better handled since reduces embed_batch size
      // falsy values filtered out in SmartEmbedModel.embed_batch
      const hash = await create_hash(this._embed_input);
      if(hash === this.hash) return false; // already embedded
    }
    return this._embed_input;
  }

  // CRUD
  async read(opts = {}) {
    return await this.source_adapter.block_read(opts);
  }

  async append(append_content) {
    await this.source_adapter.block_append(append_content);
  }

  async update(new_block_content, opts = {}) {
    await this.source_adapter.block_update(new_block_content, opts);
  }

  async remove() {
    await this.source_adapter.block_remove();
  }

  async move_to(to_key) {
    try {
      await this.source_adapter.block_move_to(to_key);
    } catch (error) {
      console.error('error_during_block_move:', error);
      throw error;
    }
  }

  get breadcrumbs() {
    return this.key
      .split("/")
      .join(" > ")
      .split("#")
      .slice(0, -1) // remove last element (contained in content)
      .join(" > ")
      .replace(".md", "")
    ;
  }
  get excluded() {
    const block_headings = this.path.split("#").slice(1); // remove first element (file path)
    if(this.source_collection.excluded_headings.some(heading => block_headings.includes(heading))) return true;
    return this.source.excluded;
  }
  get file_path() { return this.source.file_path; }
  get file_type() { return this.source.file_type; }
  get folder() { return this.path.split("/").slice(0, -1).join("/"); }
  get embed_link() {
    return `![[${this.link}]]`;
  }
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }
  get has_lines() { return this.lines && this.lines.length === 2; }
  get is_block() { return this.key.includes("#"); }
  get is_gone() {
    if (!this.source?.file) return true; // gone if missing entity or file
    if (!this.source?.data?.blocks?.[this.sub_key]) return true;
    return false;
  }
  get is_unembedded() {
    if(this.excluded) return false;
    return super.is_unembedded;
  }
  get sub_key() { return "#" + this.key.split("#").slice(1).join("#"); }
  // get lines() { return { start: this.data.lines[0], end: this.data.lines[1] }; };
  get lines() { return this.source?.data?.blocks?.[this.sub_key]; }
  get line_start() { return this.lines?.[0]; }
  get line_end() { return this.lines?.[1]; }
  get link() {
    // if regex matches "page #" (case-insensitive), return page number
    if(/^.*page\s*(\d+).*$/i.test(this.sub_key)){
      const number = this.sub_key.match(/^.*page\s*(\d+).*$/i)[1];
      return `${this.source.path}#page=${number}`;
    }else{
      return this.source.path;
    }
  }
  // use text length to detect changes
  get name() {
    const source_name = this.source.name;
    const block_path_parts = this.key.split("#").slice(1);
    if(this.should_show_full_path) return [source_name, ...block_path_parts].join(" > ");
    if(block_path_parts[block_path_parts.length-1][0] === "{") block_path_parts.pop(); // remove block index
    return [source_name, block_path_parts.pop()].join(" > ");
  }
  // uses data.lines to get next block
  get next_block() {
    if (!this.data.lines) return null;
    const next_line = this.data.lines[1] + 1;
    return this.source.blocks?.find(block => next_line === block.data?.lines?.[0]);
  }
  get outlink_paths() { return this.source.outlink_paths; }
  get path() { return this.key; }
  /**
   * Should embed if block is not completely covered by sub_blocks (and those sub_blocks are large enough to embed)
   * (sub_blocks has line_start+1 and line_end)
   * @returns {boolean}
   */
  get should_embed() {
    try{
      if(this.embed_model && this.size < this.embed_model.min_chars) return false;
      const match_line_start = this.line_start + 1;
      const match_line_end = this.line_end;
      const { has_line_start, has_line_end } = Object.entries(this.source?.data?.blocks || {})
        .reduce((acc, [key, range]) => {
          if(!key.startsWith(this.sub_key+"#")) return acc;
          if(range[0] === match_line_start) acc.has_line_start = key;
          if(range[1] === match_line_end) acc.has_line_end = key;
          return acc;
        }, {has_line_start: null, has_line_end: null})
      ;
      if (has_line_start && has_line_end){
        // ensure start and end blocks are large enough to embed before skipping embedding (returning false) for this block
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
  get size() { return this.data.size; }
  get source() { return this.source_collection.get(this.source_key); }
  get source_adapter() {
    if(this._source_adapter) return this._source_adapter;
    if(this.source_adapters[this.file_type]) this._source_adapter = new this.source_adapters[this.file_type](this);
    else this._source_adapter = new this.source_adapters["default"](this);
    return this._source_adapter;
  }
  get source_adapters() { return this.source.source_adapters; }
  get source_collection() { return this.env.smart_sources; }
  get source_key() { return this.key.split("#")[0]; }
  get sub_blocks() {
    return this.source?.blocks?.filter(block => block.key.startsWith(this.key+"#") && block.line_start > this.line_start && block.line_end <= this.line_end) || [];
  }

  // source dependent
  get data_path() { return this.source.data_path; }
  get data_file() { return this.source.data_file; }
  get excluded_lines() { return this.source.excluded_lines; }
  get file() { return this.source.file; }
  get is_canvas() { return this.source.is_canvas; }
  get is_excalidraw() { return this.source.is_excalidraw; }
  get meta_changed() { return this.source.meta_changed; }
  get mtime() { return this.source.mtime; }
  get multi_ajson_file_name() { return this.source.multi_ajson_file_name; }
  get smart_change_adapter() { return this.source.smart_change_adapter; }

  // COMPONENTS
  get component() { return render_source_component; }

  // CURRENTLY UNUSED
  async get_next_k_shot(i) {
    if (!this.next_block) return null;
    const current = await this.get_content();
    const next = await this.next_block.get_content();
    return `---BEGIN CURRENT ${i}---\n${current}\n---END CURRENT ${i}---\n---BEGIN NEXT ${i}---\n${next}\n---END NEXT ${i}---\n`;
  }

  // DEPRECATED
  async get_content() { return (await this.read()) || "BLOCK NOT FOUND"; }
  // DEPRECATED since v2
  get note() { return this.source; }
  get note_key() { return this.key.split("#")[0]; }

}