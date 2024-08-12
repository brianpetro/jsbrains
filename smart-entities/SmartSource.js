import { create_hash } from "./create_hash.js";
import { SmartEntity } from "./SmartEntity.js";
import { wrap_changes } from "smart-entities-actions/utils/wrap_changes.js";

export class SmartSource extends SmartEntity {
  static get defaults() {
    return {
      data: {
        history: [], // array of { mtime, hash, length, blocks[] }
      },
      _embed_input: null, // stored temporarily
    };
  }
  async init() {
    // this.env.smart_blocks.import(this, { show_notice: false });
    await this.parse_content();
    this.queue_save();
    if(this.is_unembedded) this.smart_embed.embed_entity(this);
  }
  async parse_content() {
    const content = await this.get_content();
    const hash = await create_hash(content); // update hash
    if (hash !== this.last_history?.hash) {
      this.data.history.push({ blocks: {}, mtime: this.t_file.stat.mtime, size: this.t_file.stat.size, hash }); // add history entry
      this.data.embeddings = {}; // clear embeddings
    } else {
      this.last_history.mtime = this.t_file.stat.mtime; // update mtime
      this.last_history.size = this.t_file.stat.size; // update size
      if(!this.last_history.blocks) this.last_history.blocks = {};
    }
    const { blocks, outlinks } = await this.env.smart_chunks.parse(this);
    this.data.outlinks = outlinks;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const item = this.env.smart_blocks.create_or_update(block);
      this.last_history.blocks[item.key] = true;
    }
  }

  get excluded_lines() {
    return this.blocks.filter(block => block.excluded).map(block => block.lines);
  }
  async get_content() { return await this.env.main.read_file(this.data.path); } // DECPRECATE for this.read?
  async get_embed_input() {
    if (typeof this._embed_input === 'string' && this._embed_input.length) return this._embed_input; // return cached (temporary) input
    let content = await this.get_content(); // get content from file
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
  open() { this.env.main.open_note(this.data.path); }
  get_block_by_line(line) { return this.blocks.find(block => block.data.lines[0] <= line && block.data.lines[1] >= line); }
  get block_vecs() { return this.blocks.map(block => block.vec).filter(vec => vec); } // filter out blocks without vec
  get blocks() { return Object.keys(this.last_history.blocks).map(block_key => this.env.smart_blocks.get(block_key)).filter(block => block); } // filter out blocks that don't exist
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }
  get meta_changed() {
    try {
      if (!this.last_history) return true;
      if (!this.t_file) return true;
      if ((this.last_history?.mtime || 0) < this.t_file.stat.mtime) {
        const size_diff = Math.abs(this.last_history.size - this.t_file.stat.size);
        const size_diff_ratio = size_diff / (this.last_history.size || 1);
        if (size_diff_ratio > 0.01) return true; // if size diff greater than 1% of last_history.size, assume file changed
        // else console.log(`Smart Connections: Considering change of <1% (${size_diff_ratio * 100}%) "unchanged" for ${this.data.path}`);
      }
      return false;
    } catch (e) {
      console.warn("error getting meta changed for ", this.data.path, ": ", e);
      return true;
    }
  }
  get is_canvas() { return this.data.path.endsWith("canvas"); }
  get is_excalidraw() { return this.data.path.endsWith("excalidraw.md"); }
  get is_gone() { return this.t_file === null; }
  get last_history() { return this.data.history.length ? this.data.history[this.data.history.length - 1] : null; }
  get mean_block_vec() { return this._mean_block_vec ? this._mean_block_vec : this._mean_block_vec = this.block_vecs.reduce((acc, vec) => acc.map((val, i) => val + vec[i]), Array(384).fill(0)).map(val => val / this.block_vecs.length); }
  get median_block_vec() { return this._median_block_vec ? this._median_block_vec : this._median_block_vec = this.block_vecs[0]?.map((val, i) => this.block_vecs.map(vec => vec[i]).sort()[Math.floor(this.block_vecs.length / 2)]); }
  get t_file() { return this.env.main.get_tfile(this.data.path); } // should be better handled using non-Obsidian API
  // v2.2
  get ajson() {
    if(this.deleted) return `${JSON.stringify(this.ajson_key)}: null`;
    return [
      super.ajson,
      ...this.blocks.map(block => block.ajson).filter(ajson => ajson),
    ].join("\n");
  }
  get file_path() { return this.data.path; }
  get file_type() { return this.t_file.extension; }
  get outlink_paths() {
    return (this.data.outlinks || [])
      .filter(link => !link.target.startsWith("http"))
      .map(link => {
        const link_path = this.env.main.get_link_target_path(link.target, this.file_path);
        return link_path;
      })
      .filter(link_path => link_path);
  }
  get inlinks() { return Object.keys(this.env.links?.[this.data.path] || {}); }
  get size() { return this.last_history?.size || 0; }
  get mtime() { return this.last_history?.mtime || 0; }
  get is_unembedded() {
    if(this.meta_changed) return true;
    return super.is_unembedded;
  }
  get excluded() { return !this.env.is_included(this.data.path); }

  // FS
  /**
   * Checks if the source file exists in the file system.
   * @returns {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
   */
  async has_source_file() { return await this.fs.exists(this.data.path); }

  // CRUD
  /**
   * Appends content to the end of the source file.
   * @param {string} content - The content to append to the file.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async append(content) {
    if(this.should_use_change_syntax) content = wrap_changes(this, "", content);
    const current_content = await this.read();
    const new_content = [
      current_content,
      "",
      content,
    ].join("\n").trim();
    await this.update(new_content, { skip_wrap_changes: true });
  }

  /**
   * Updates the entire content of the source file.
   * @param {string} full_content - The new content to write to the file.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async update(full_content, opts = {}) {
    full_content = await this.update_pre_process(full_content, opts);
    await this.fs.write(this.data.path, full_content);
    // this.debounced_init();
    await this.parse_content();
  }
  debounced_init() {
    if(this.init_timeout) clearTimeout(this.init_timeout);
    this.init_timeout = setTimeout(() => {
      this.init();
      this.init_timeout = null;
    }, 900);
  }

  /**
   * Reads the entire content of the source file.
   * @returns {Promise<string>} A promise that resolves with the content of the file.
   */
  async read() { return await this.fs.read(this.data.path); }

  /**
   * Removes the source file from the file system and deletes the entity.
   * This is different from delete() because it also removes the source file.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async remove() {
    await this.fs.remove(this.data.path);
    this.delete();
  }
  /**
   * Moves the current source to a new location.
   * Handles the destination as a string (new path) or entity (block or source).
   * 
   * @param {string|Object|SmartEntity} entity_ref - The destination path or entity to move to.
   * @throws {Error} If the entity reference is invalid.
   * @returns {Promise<void>} A promise that resolves when the move operation is complete.
   */
  async move_to(entity_ref) {
    const new_path = typeof entity_ref === "string" ? entity_ref : entity_ref.key;
    if (!new_path) {
      throw new Error("Invalid entity reference for move_to operation");
    }

    const current_content = await this.read();
    const target_source_key = new_path.split("#")[0];
    const target_source = this.env.smart_sources.get(target_source_key);

    if (new_path.includes("#")) {
      // If the new path includes headings, update the content with the new headings
      const headings = new_path.split("#").slice(1);
      const new_headings_content = headings.map((heading, i) => `${"#".repeat(i + 1)} ${heading}`).join("\n");
      const new_content = new_headings_content + "\n" + current_content;
      await this.update(new_content);
    }

    if (target_source) {
      // If target exists, merge the content
      await target_source.merge(current_content, { mode: 'append_blocks' });
    } else {
      // Rename the file in the filesystem
      await this.fs.rename(this.data.path, target_source_key);
      // Create or update the collection with the new path
      await this.collection.create_or_update({ path: target_source_key, content: current_content });
    }

    // Remove the current source after renaming or merging
    await this.remove();
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
    const { mode = 'append_blocks' } = opts;
    const { blocks } = await this.env.smart_chunks.parse({
      content,
      file_path: this.data.path,
    });
    // console.log(blocks);
    if(!Array.isArray(blocks)) throw new Error("merge error: parse returned blocks that were not an array", blocks);
    // should read and re-parse content to make sure all blocks are up to date
    await this.parse_content();
    // get content for each block (SMart CHunks currently returns embed_input format 2024-08-09)
    blocks.forEach(block => {
      block.content = content
        .split("\n")
        .slice(
          block.lines[0], // - 1, // minus 1 to account for Smart Chunks being 1-indexed as of 2024-08-09
          block.lines[1] + 1
        )
        .join("\n")
      ;
      // console.log({ block });
      const match = this.blocks.find(b => b.key === block.path);
      if(match){
        block.matched = true;
        match.matched = true;
      }
      // console.log({ block });
    });
    if(mode === "replace_all"){
      if(this.should_use_change_syntax){
        let all = "";
        const new_blocks = blocks.sort((a, b) => a.lines[0] - b.lines[0]);
        // if first block line start is >0 then add prior content to all
        if(new_blocks[0].lines[0] > 0){
          all += content.split("\n").slice(0, new_blocks[0].lines[0]).join("\n");
        }
        for(let i = 0; i < new_blocks.length; i++){
          const block = new_blocks[i];
          if(all.length) all += "\n";
          if(block.matched){
            const og = this.env.smart_blocks.get(block.path);
            all += wrap_changes(this, (await og.read()), block.content);
          }else{
            all += wrap_changes(this, "", block.content);
          }
        }
        const unmatched_old = this.blocks.filter(b => !b.matched);
        for(let i = 0; i < unmatched_old.length; i++){
          const block = unmatched_old[i];
          all += (all.length ? "\n" : "") + wrap_changes(this, await block.read(), "");
        }
        await this.update(all, { skip_wrap_changes: true });
      }else{
        await this.update(content);
      }
    }
    else{
      for(let i = 0; i < blocks.length; i++){
        const block = blocks[i];
        if(block.matched){
          if(mode === "append_blocks"){
            await this.env.smart_blocks.get(block.path).append(block.content);//.split("\n").slice(1).join("\n"));
          }else{
            await this.env.smart_blocks.get(block.path).update(block.content);
          }
        }
      }
      // append any unmatched blocks to the end of the file
      const unmatched_content = blocks
        .filter(block => !block.matched)
        .map(block => block.content)
        .join("\n")
      ;
      if(unmatched_content.length){
        await this.append(unmatched_content);
      }
    }
    await this.parse_content();
  }

}