import { increase_heading_depth } from "../utils/increase_heading_depth.js";
import { TextSourceAdapter } from "./text.js";
import { markdown_to_blocks } from "../blocks/markdown_to_blocks.js";
import { create_hash } from "../utils/create_hash.js";

export class MarkdownSourceAdapter extends TextSourceAdapter {
  get fs() { return this.source_collection.fs; }
  get data() { return this.item.data; }
  get file_path() { return this.item.file_path; }

  async import() {
    const content = await this.read();
    const hash = await create_hash(content);
    if(this.data.hash === hash) return console.log("File stats changed, but content is the same. Skipping import.");
    const blocks = markdown_to_blocks(content);
    this.data.blocks = blocks;
    const outlinks = get_markdown_links(content);
    this.data.outlinks = outlinks;
    for (const [sub_key, value] of Object.entries(blocks)) {
      const block_key = this.item.key + sub_key;
      const block_content = content.split("\n").slice(value[0] - 1, value[1]).join("\n");
      const block_outlinks = get_markdown_links(block_content);
      const block = await this.item.block_collection.create_or_update({
        key: block_key,
        outlinks: block_outlinks,
        size: block_content.length,
      });
      block._embed_input = block.breadcrumbs + "\n" + block_content; // improve performance by preventing extra read
      block.data.hash = await create_hash(block._embed_input);
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
    const {
      mode = "replace_all",
    } = opts;
    if (mode === "replace_all") {
      await this.merge(full_content, { mode: "replace_all" });
    } else if (mode === "merge_replace") {
      await this.merge(full_content, { mode: "replace_blocks" });
    } else if (mode === "merge_append") {
      await this.merge(full_content, { mode: "append_blocks" });
    }
  }

  async _update(content) {
    await this.fs.write(this.file_path, content);
  }

  async read(opts = {}) {
    let content = await this._read();
    
    if (opts.no_changes) {
      const unwrapped = this.smart_change.unwrap(content, {file_type: this.item.file_type});
      content = unwrapped[opts.no_changes === 'after' ? 'after' : 'before'];
    }
    if (opts.add_depth) {
      content = increase_heading_depth(content, opts.add_depth);
    }
    
    return content;
  }

  async _read() {
    return await this.fs.read(this.file_path);
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
    const target_source_key = new_path.split("#")[0];
    const target_source = this.env.smart_sources.get(target_source_key);

    if (new_path.includes("#")) {
      const headings = new_path.split("#").slice(1);
      const new_headings_content = headings.map((heading, i) => `${"#".repeat(i + 1)} ${heading}`).join("\n");
      const new_content = new_headings_content + "\n" + current_content;
      await this._update(new_content);
    }

    if (target_source) {
      await target_source.merge(current_content, { mode: 'append_blocks' });
    } else {
      await this.fs.rename(this.file_path, target_source_key);
      const new_source = await this.item.collection.create_or_update({ path: target_source_key, content: current_content });
      await new_source.import();
    }

    if (this.item.key !== target_source_key) await this.remove();
  }

  async merge(content, opts = {}) {
    const { mode = 'append_blocks' } = opts;
    const { blocks } = await this.item.smart_chunks.parse({
      content,
      file_path: this.file_path,
    });

    if (!Array.isArray(blocks)) throw new Error("merge error: parse returned blocks that were not an array", blocks);

    blocks.forEach(block => {
      block.content = content
        .split("\n")
        .slice(block.lines[0], block.lines[1] + 1)
        .join("\n");

      const match = this.item.blocks.find(b => b.key === block.path);
      if (match) {
        block.matched = true;
        match.matched = true;
      }
    });

    if (mode === "replace_all") {
      if (this.smart_change) {
        let all = "";
        const new_blocks = blocks.sort((a, b) => a.lines[0] - b.lines[0]);
        if (new_blocks[0].lines[0] > 0) {
          all += content.split("\n").slice(0, new_blocks[0].lines[0]).join("\n");
        }
        for (let i = 0; i < new_blocks.length; i++) {
          const block = new_blocks[i];
          if (all.length) all += "\n";
          if (block.matched) {
            const og = this.env.smart_blocks.get(block.path);
            all += this.smart_change.wrap("content", {
              before: await og.read({ no_changes: "before", headings: "last" }),
              after: block.content,
              adapter: this.item.smart_change_adapter
            });
          } else {
            all += this.smart_change.wrap("content", {
              before: "",
              after: block.content,
              adapter: this.item.smart_change_adapter
            });
          }
        }
        const unmatched_old = this.item.blocks.filter(b => !b.matched);
        for (let i = 0; i < unmatched_old.length; i++) {
          const block = unmatched_old[i];
          all += (all.length ? "\n" : "") + this.smart_change.wrap("content", {
            before: await block.read({ no_changes: "before", headings: "last" }),
            after: "",
            adapter: this.item.smart_change_adapter
          });
        }
        await this._update(all);
      } else {
        await this._update(content);
      }
    } else {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.matched) {
          const to_block = this.env.smart_blocks.get(block.path);
          if (mode === "append_blocks") {
            await to_block.append(block.content);
          } else {
            await to_block.update(block.content);
          }
        }
      }
      const unmatched_content = blocks
        .filter(block => !block.matched)
        .map(block => block.content)
        .join("\n");
      if (unmatched_content.length) {
        await this.append(unmatched_content);
      }
    }
  }

  async block_read(opts = {}) {
    if(!this.item.line_start) return "BLOCK NOT FOUND";
    const source_content = await this.read();
    
    // if (opts.no_changes && this.smart_change) {
    //   const unwrapped = this.smart_change.unwrap(content, {file_type: this.item.file_type});
    //   content = unwrapped[opts.no_changes === 'after' ? 'after' : 'before'];
    // }
    // if (opts.headings) {
    //   content = this.prepend_headings(content, opts.headings);
    // }
    // if (opts.add_depth) {
    //   content = increase_heading_depth(content, opts.add_depth);
    // }
    const block_content = get_line_range(source_content, this.item.line_start, this.item.line_end);
    const breadcrumbs = this.item.breadcrumbs;
    const embed_input = breadcrumbs + "\n" + block_content;
    const hash = await create_hash(embed_input);
    if(hash !== this.item.hash){
      const blocks = markdown_to_blocks(source_content);
      const block_range = Object.entries(blocks).find(([k,v]) => k === this.item.sub_key)[1];
      this.item.queue_import();
      return get_line_range(source_content, block_range[0], block_range[1]);
    }
    return block_content;
  }


  prepend_headings(content, mode) {
    const headings = this.file_path.split('#').slice(1);
    let prepend_content = '';
    
    if (mode === 'all') {
      prepend_content = headings.map((h, i) => '#'.repeat(i + 1) + ' ' + h).join('\n');
    } else if (mode === 'last') {
      prepend_content = '#'.repeat(headings.length) + ' ' + headings[headings.length - 1];
    }
    
    return prepend_content + (prepend_content ? '\n' : '') + content;
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
    await this.item.source.parse_content();
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
    const all_lines = full_content.split("\n");
    const new_content = [
      ...all_lines.slice(0, this.item.line_start),
      new_block_content,
      ...all_lines.slice(this.item.line_end + 1),
    ].join("\n");
    await this.item.source._update(new_content);
    await this.item.source.parse_content();
  }

  async block_remove() {
    if(this.item.sub_blocks.length){
      // leave heading if has sub-blocks
      await this._block_update((await this.block_read({ no_changes: "before", headings: "last" })).split("\n")[0]);
    }else{
      await this._block_update("");
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
    await this.item.source.parse_content();
  }
}

/**
 * Extracts links from markdown content.
 * @param {string} content 
 * @returns {Array<{title: string, target: string, line: number}>}
 */
function get_markdown_links(content) {
    const markdown_link_pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const wikilink_pattern = /\[\[([^\|\]]+)(?:\|([^\]]+))?\]\]/g;
    const result = [];

    const extract_links_from_pattern = (pattern, type) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const title = type === 'markdown' ? match[1] : (match[2] || match[1]);
            const target = type === 'markdown' ? match[2] : match[1];
            const line = content.substring(0, match.index).split('\n').length;
            result.push({ title, target, line });
        }
    };

    extract_links_from_pattern(markdown_link_pattern, 'markdown');
    extract_links_from_pattern(wikilink_pattern, 'wikilink');

    result.sort((a, b) => a.line - b.line || a.target.localeCompare(b.target));

    return result;
}
function get_line_range(content, start_line, end_line) {
  const lines = content.split("\n");
  return lines.slice(start_line - 1, end_line).join("\n");
}

