import { SmartEntity } from "./SmartEntity.js";
import { wrap_changes } from "smart-entities-actions/utils/wrap_changes.js";

export class SmartBlock extends SmartEntity {
  static get defaults() {
    return {
      data: {
        text: null,
        // hash: null,
        length: 0,
      },
      _embed_input: '', // stored temporarily
    };
  }
  // SmartChunk: text, length, path
  update_data(data) {
    if (this.should_clear_embeddings(data)) this.data.embeddings = {};
    if (!this.vec) this._embed_input += data.text; // store text for embedding
    delete data.text; // clear data.text to prevent saving text
    super.update_data(data);
    return true;
  }
  should_clear_embeddings(data) {
    if(this.is_new) return true;
    if(this.smart_embed && this.vec?.length !== this.smart_embed.dims) return true;
    if(this.data.length !== data.length) return true;
    return false;
  }
  init() {
    if (!this.source) return console.log({ "no source for block": this.data });
    if(this.smart_embed && this.is_unembedded) this.smart_embed.embed_entity(this);
  }
  async get_content() {
    if (!this.note) return null;
    try {
      if (this.has_lines) { // prevents full parsing of note if not needed
        const all_lines = await this.note.get_content();
        const block_content = all_lines.split("\n").slice(this.line_start, this.line_end + 1).join("\n");
        return block_content;
      }
      const block_content = await this.env.smart_chunks.get_block_from_path(this.data.path, this.note);
      return block_content;
    } catch (e) {
      console.log("error getting block content for ", this.data.path, ": ", e);
      return "BLOCK NOT FOUND";
    }
  }
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
  get breadcrumbs() { return this.data.path.split("/").join(" > ").split("#").join(" > ").replace(".md", ""); }
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }
  get lines() { return { start: this.data.lines[0], end: this.data.lines[1] }; };
  get has_lines() { return this.data.lines && this.data.lines.length === 2; }
  get folder() { return this.data.path.split("/").slice(0, -1).join("/"); }
  get is_block() { return this.data.path.includes("#"); }
  get is_gone() {
    if (!this.note?.t_file) return true; // gone if missing entity or file
    if (!this.note.last_history.blocks[this.key]) return true;
    return false;
  }
  // use text length to detect changes
  get name() { return (!this.env.main.settings.show_full_path ? this.data.path.split("/").pop() : this.data.path.split("/").join(" > ")).split("#").join(" > ").replace(".md", ""); }
  // uses data.lines to get next block
  get next_block() {
    if (!this.data.lines) return null;
    const next_line = this.data.lines[1] + 1;
    return this.note.blocks?.find(block => next_line === block.data?.lines?.[0]);
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
  /**
   * Reads the content of the block from the source file.
   * @returns {Promise<string>} The content of the block.
   */
  async read() {
    return (await this.source.read())
      .split("\n")
      .slice(this.line_start, this.line_end + 1)
      .join("\n")
    ;
  }
  async read_with_sub_blocks() {
    const content = await this.read();
    const sub_blocks = await Promise.all(this.sub_blocks
      .sort((a, b) => a.data.lines[0] - b.data.lines[0]) // sort sub-blocks by line number in ASCENDING order
      .map(async block => await block.read())
    );
    return [content, ...sub_blocks].join("\n\n");
  }

  /**
   * Appends content to the end of the block.
   * @param {string} append_content - The content to append.
   * @returns {Promise<void>}
   */
  async append(append_content) {
    let all_lines = (await this.source.read()).split("\n");
    // if first line of block is same as first line of append_content, remove it
    if(all_lines[this.line_start] === append_content.split("\n")[0]){
      append_content = append_content.split("\n").slice(1).join("\n");
    }
    if(this.should_use_change_syntax) append_content = wrap_changes(this, "", append_content);
    // use this.line_start and this.line_end to insert append_content at the correct position
    const content_before = all_lines.slice(0, this.line_end + 1);
    const content_after = all_lines.slice(this.line_end + 1);
    // const content_before = all_lines.slice(0, this.line_end);
    // const content_after = all_lines.slice(this.line_end);
    const new_content = [
      ...content_before,
      "", // add a blank line before appending
      append_content,
      ...content_after,
    ].join("\n").trim();
    await this.source.update(new_content, { skip_wrap_changes: true });
  }

  /**
   * Updates the content of the block.
   * @param {string} new_block_content - The new content for the block.
   * @returns {Promise<void>}
   */
  async update(new_block_content, opts = {}) {
    new_block_content = await this.update_pre_process(new_block_content, opts);
    const full_content = await this.source.read();
    const all_lines = full_content.split("\n");
    const new_content = [
      // ...all_lines.slice(0, this.line_start - 1), // Smart Chunks is Base-1 as of 2024-08-09
      ...all_lines.slice(0, this.line_start),
      new_block_content,
      ...all_lines.slice(this.line_end + 1),
    ].join("\n");
    await this.source.update(new_content, { skip_wrap_changes: true });
  }

  /**
   * Removes the block from the source file and deletes the entity.
   * Deletes all sub-blocks as well.
   * @returns {Promise<void>}
   */
  async remove() {
    if(this.sub_blocks.length) {
      await Promise.all(this.sub_blocks
        .sort((a, b) => b.data.lines[0] - a.data.lines[0]) // sort sub-blocks by line number in DESCENDING order
        .map(async block => await block.remove())
      );
    }
    await this.update("");
    this.delete();
  }

  /**
   * Moves the block to a new location.
   * @param {string} to_key - The key of the destination (can be a block or source).
   * @returns {Promise<void>}
   */
  async move_to(to_key) {
    const to_collection_name = to_key.includes("#") ? "smart_blocks" : "smart_sources";
    const to_entity = this.env[to_collection_name].get(to_key);
    const content = await this.read_with_sub_blocks();
    try {
      await this.remove();
    } catch (e) {
      console.warn("error removing block: ", e);
    }
    try {
      if(to_entity) {
        await to_entity.append(content);
      } else {
        const target_source_key = to_key.split("#")[0];
        const target_source = this.env.smart_sources.get(target_source_key);
        if (to_key.includes("#")) {
          const headings = to_key.split("#").slice(1);
          const new_headings_content = headings.map((heading, i) => `${"#".repeat(i + 1)} ${heading}`).join("\n");
          const new_content = [
              new_headings_content,
              ...content.split("\n").slice(1)
          ].join("\n").trim();
          if(target_source) await target_source.append(new_content);
          else await this.env.smart_sources.create(target_source_key, new_content);
        } else {
          if(target_source) await target_source.append(content);
          else await this.env.smart_sources.create(target_source_key, content);
        }
      }
    } catch (e) {
      console.warn("error moving block: ", e);
      // return to original location
      this.deleted = false;
      await this.update(content);
    }
    await this.source.parse_content();
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