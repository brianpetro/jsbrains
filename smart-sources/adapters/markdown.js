import { increase_heading_depth } from "../utils/increase_heading_depth.js";
import { FileSourceAdapter } from "./file.js";
import { markdown_to_blocks } from "../blocks/markdown_to_blocks.js";
import { get_markdown_links } from "../utils/get_markdown_links.js";
import { get_line_range } from "../utils/get_line_range.js";
import { block_read, block_update, block_destroy } from "../blocks/markdown_crud.js";

/**
 * @module MarkdownSourceAdapter
 * @description Adapter that reads and writes markdown files as sources for Smart Connections.
 */
export class MarkdownSourceAdapter extends FileSourceAdapter {
  get fs() { return this.source_collection.fs; }
  get data() { return this.item.data; }
  get source() { return this.item.source ? this.item.source : this.item; }

  async import() {
    const content = await this._read();
    if (!content) return console.warn("No content to import for " + this.file_path);
    
    const hash = await this.create_hash(content);
    if (this.data.blocks && this.data.hash === hash) {
      console.log("File stats changed, but content is the same. Skipping import.");
      return;
    }

    this.data.hash = hash; // set import hash
    this.data.last_read_hash = hash;

    const blocks_obj = markdown_to_blocks(content);
    this.data.blocks = blocks_obj;

    const outlinks = get_markdown_links(content);
    this.data.outlinks = outlinks;

    if (this.item.block_collection) {
      for (const [sub_key, line_range] of Object.entries(blocks_obj)) {
        const block_key = `${this.source.key}${sub_key}`;
        const block_content = get_line_range(content, line_range[0], line_range[1]);
        const block_outlinks = get_markdown_links(block_content);
        
        const block = await this.item.block_collection.create_or_update({
          key: block_key,
          outlinks: block_outlinks,
          size: block_content.length,
        });

        block._embed_input = `${block.breadcrumbs}\n${block_content}`; // improves perf by preventing extra read at embed-time
        block.data.hash = await this.create_hash(block._embed_input);
      }
    }
  }

  async append(content) {
    if (this.smart_change) {
      content = this.smart_change.wrap("content", {
        before: "",
        after: content,
        adapter: this.item.smart_change_adapter
      });
    }
    const current_content = await this.read();
    const new_content = [
      current_content,
      "",
      content,
    ].join("\n").trim();
    await this._update(new_content);
  }

  async update(full_content, opts = {}) {
    const { mode = "append_blocks" } = opts;
    if (mode === "replace_all") {
      await this._update(full_content);
    } else if (mode === "replace_blocks") {
      await this.merge(full_content, { mode: "replace_blocks" });
    } else if (mode === "append_blocks") {
      await this.merge(full_content, { mode: "append_blocks" });
    }
  }
  async _update(content) {
    await super.update(content);
  }


  async read(opts = {}) {
    let content = await this._read();
    this.source.data.last_read_hash = await this.create_hash(content);
    if (this.source.last_read_hash !== this.source.hash) {
      this.source.loaded_at = null;
      await this.source.import();
    }
    if (opts.no_changes && this.smart_change) {
      const unwrapped = this.smart_change.unwrap(content, { file_type: this.item.file_type });
      content = unwrapped[opts.no_changes === 'after' ? 'after' : 'before'];
    }
    if (opts.add_depth) {
      content = increase_heading_depth(content, opts.add_depth);
    }
    
    return content;
  }
  async _read() {
    return await super.read();
  }


  async remove() {
    await this.fs.remove(this.file_path);
    this.item.delete();
  }

  async move_to(entity_ref) {
    const new_path = typeof entity_ref === "string" ? entity_ref : entity_ref.key;
    if (!new_path) {
      throw new Error("Invalid entity reference for move_to operation");
    }
  
    const current_content = await this.read();
    const [target_source_key, ...headings] = new_path.split("#");
    const target_source = this.env.smart_sources.get(target_source_key);
  
    if (headings.length > 0) {
      const new_headings_content = this.construct_headings(headings);
      const new_content = `${new_headings_content}\n${current_content}`;
      await this._update(new_content);
    }
  
    if (target_source) {
      await this.merge(current_content, { mode: 'append_blocks' });
    } else {
      await this.rename_and_import(target_source_key, current_content);
    }
  
    if (this.item.key !== target_source_key) await this.remove();
  }
  
  construct_headings(headings) {
    return headings.map((heading, i) => `${"#".repeat(i + 1)} ${heading}`).join("\n");
  }
  
  async rename_and_import(target_source_key, content) {
    await this.fs.rename(this.file_path, target_source_key);
    const new_source = await this.item.collection.create_or_update({ path: target_source_key, content });
    await new_source.import();
  }

  /**
   * Merge content into the source
   * @param {string} content - The content to merge into the source
   * @param {Object} opts - Options for the merge operation
   * @param {string} opts.mode - The mode to use for the merge operation. Defaults to 'append_blocks' (may also be 'replace_blocks')
   */
  async merge(content, opts = {}) {
    const { mode = 'append_blocks' } = opts;
    const blocks_obj = markdown_to_blocks(content);

    if (typeof blocks_obj !== 'object' || Array.isArray(blocks_obj)) {
      console.warn("merge error: Expected an object from markdown_to_blocks, but received:", blocks_obj);
      throw new Error("merge error: markdown_to_blocks did not return an object as expected.");
    }
    const { new_blocks, new_with_parent_blocks, changed_blocks, same_blocks } = await this.get_changes(blocks_obj, content);
    for(const block of new_blocks){
      await this.append(block.content);
    }
    for(const block of new_with_parent_blocks){
      const parent_block = this.env.smart_blocks.get(block.parent_key);
      await parent_block.append(block.content);
    }
    for(const block of changed_blocks){
      const changed_block = this.item.block_collection.get(block.key);
      if(mode === "replace_blocks"){
        await changed_block.update(block.content);
      }else{
        await changed_block.append(block.content);
      }
    }
  }

  async get_changes(blocks_obj, content) {
    const new_blocks = [];
    const new_with_parent_blocks = [];
    const changed_blocks = [];
    const same_blocks = [];
    const existing_blocks = this.source.data.blocks || {};
    for (const [sub_key, line_range] of Object.entries(blocks_obj)) {
      const has_existing = !!existing_blocks[sub_key];
      const block_key = `${this.source.key}${sub_key}`;
      const block_content = get_line_range(content, line_range[0], line_range[1]);
      if(!has_existing){
        new_blocks.push({
          key: block_key,
          state: "new",
          content: block_content,
        });
        continue;
      }
      let has_parent;
      let headings = sub_key.split("#");
      let parent_key;
      while(!has_parent && headings.length > 0){
        headings.pop(); // remove the last heading
        parent_key = headings.join("#");
        has_parent = !!existing_blocks[parent_key];
      }
      if(has_parent){
        new_with_parent_blocks.push({
          key: block_key,
          parent_key: `${this.source.key}${parent_key}`,
          state: "new",
          content: block_content,
        });
        continue;
      }
      const block = this.item.env.smart_blocks.get(block_key);
      const content_hash = await this.create_hash(block_content);
      if(content_hash !== block.hash){
        changed_blocks.push({
          key: block_key,
          state: "changed",
          content: block_content,
        });
        continue;
      }
      same_blocks.push({
        key: block_key,
        state: "same",
        content: block_content,
      });
    }
    return {
      new_blocks,
      new_with_parent_blocks,
      changed_blocks,
      same_blocks,
    }
  }

  async block_read(opts = {}) {
    const source_content = await this.read();
    
    try {
      const block_content = block_read(source_content, this.item.sub_key);
      const breadcrumbs = this.item.breadcrumbs;
      const embed_input = breadcrumbs + "\n" + block_content;
      const hash = await this.create_hash(embed_input);
      
      if (hash !== this.item.hash) {
        this.item.source?.queue_import();
        return this._block_read(source_content, this.item.sub_key);
      }
      
      return block_content;
    } catch (error) {
      console.warn("Error reading block:", error.message);
      return "BLOCK NOT FOUND";
    }
  }
  _block_read(source_content, block_key){
    return block_read(source_content, block_key);
  }

  async block_append(append_content) {
    let all_lines = (await this.read()).split("\n");
    if(all_lines[this.item.line_start] === append_content.split("\n")[0]){
      append_content = append_content.split("\n").slice(1).join("\n");
    }
    if(this.smart_change) append_content = this.smart_change.wrap("content", { before: "", after: append_content, adapter: this.item.smart_change_adapter });
    await this._block_append(append_content);
  }

  async _block_append(append_content) {
    let all_lines = (await this.read()).split("\n");
    const content_before = all_lines.slice(0, this.item.line_end + 1);
    const content_after = all_lines.slice(this.item.line_end + 1);
    const new_content = [
      ...content_before,
      "", // add a blank line before appending
      append_content,
      ...content_after,
    ].join("\n").trim();
    await this.item.source._update(new_content);
    await this.item.source.import();
  }

  async block_update(new_block_content, opts = {}) {
    if(this.smart_change) new_block_content = this.smart_change.wrap("content", {
      before: await this.block_read({ no_changes: "before", headings: "last" }),
      after: new_block_content,
      adapter: this.item.smart_change_adapter
    });
    await this._block_update(new_block_content);
  }

  async _block_update(new_block_content) {
    const full_content = await this.read();
    try {
      const updated_content = block_update(full_content, this.item.sub_key, new_block_content);
      await this.item.source._update(updated_content);
      await this.item.source.import();
    } catch (error) {
      console.warn("Error updating block:", error.message);
    }
  }

  async block_remove() {
    const full_content = await this.read();
    try {
      const updated_content = block_destroy(full_content, this.item.sub_key);
      await this.item.source._update(updated_content);
      await this.item.source.import();
    } catch (error) {
      console.warn("Error removing block:", error.message);
    }
    this.item.delete();
  }

  async block_move_to(to_key) {
    const to_collection_key = to_key.includes("#") ? "smart_blocks" : "smart_sources";
    const to_entity = this.env[to_collection_key].get(to_key);
    let content = await this.block_read({ no_changes: "before", headings: "last" });
    try {
      if(this.smart_change){
        const smart_change = this.smart_change.wrap('location', {
          to_key: to_key,
          before: await this.block_read({headings: 'last', no_change: 'before'}),
          adapter: this.item.smart_change_adapter
        });
        this._block_update(smart_change);
      }else{
        this.block_remove();
      }
    } catch (e) {
      console.warn("error removing block: ", e);
    }
    try {
      if(to_entity) {
        if(this.smart_change){
          content = this.smart_change.wrap("location", { from_key: this.item.source.key, after: content, adapter: this.item.smart_change_adapter });
          await to_entity._append(content);
        }else{
          await to_entity.append(content);
        }
      } else {
        const target_source_key = to_key.split("#")[0];
        const target_source = this.env.smart_sources.get(target_source_key);
        if (to_key.includes("#")) {
          const headings = to_key.split("#").slice(1);
          const new_headings_content = headings.map((heading, i) => `${"#".repeat(i + 1)} ${heading}`).join("\n");
          let new_content = [
              new_headings_content,
              ...content.split("\n").slice(1)
          ].join("\n").trim();
          if(this.smart_change) new_content = this.smart_change.wrap("location", { from_key: this.item.source.key, after: new_content, adapter: this.item.smart_change_adapter });
          if(target_source) await target_source._append(new_content);
          else await this.env.smart_sources.create(target_source_key, new_content);
        } else {
          if(this.smart_change) content = this.smart_change.wrap("location", { from_key: this.item.source.key, after: content, adapter: this.item.smart_change_adapter });
          if(target_source) await target_source._append(content);
          else await this.env.smart_sources.create(target_source_key, content);
        }
      }
    } catch (e) {
      console.warn("error moving block: ", e);
      // return to original location
      this.item.deleted = false;
      await this.block_update(content);
    }
    await this.item.source.import();
  }
}