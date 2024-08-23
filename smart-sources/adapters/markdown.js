import { increase_heading_depth } from "../utils/increase_heading_depth.js";
import { SourceAdapter, BlockAdapter } from "./_adapter.js";

export class MarkdownSourceAdapter extends SourceAdapter {

  async append(content) {
    if (this.smart_source.env.smart_change) {
      content = this.smart_source.env.smart_change.wrap("content", {
        before: "",
        after: content,
        ...this.smart_source.smart_change_opts
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
    await this.smart_source.fs.write(this.smart_source.data.path, content);
  }

  async read(opts = {}) {
    let content = await this._read();
    
    if (opts.no_changes) {
      const unwrapped = this.smart_source.env.smart_change.unwrap(content, {file_type: this.smart_source.file_type});
      content = unwrapped[opts.no_changes === 'after' ? 'after' : 'before'];
    }
    if (opts.add_depth) {
      content = increase_heading_depth(content, opts.add_depth);
    }
    
    return content;
  }

  async _read() {
    return await this.smart_source.fs.read(this.smart_source.data.path);
  }

  async remove() {
    await this.smart_source.fs.remove(this.smart_source.data.path);
    this.smart_source.delete();
  }

  async move_to(entity_ref) {
    const new_path = typeof entity_ref === "string" ? entity_ref : entity_ref.key;
    if (!new_path) {
      throw new Error("Invalid entity reference for move_to operation");
    }

    const current_content = await this.read();
    const target_source_key = new_path.split("#")[0];
    const target_source = this.smart_source.env.smart_sources.get(target_source_key);

    if (new_path.includes("#")) {
      const headings = new_path.split("#").slice(1);
      const new_headings_content = headings.map((heading, i) => `${"#".repeat(i + 1)} ${heading}`).join("\n");
      const new_content = new_headings_content + "\n" + current_content;
      await this._update(new_content);
    }

    if (target_source) {
      await target_source.merge(current_content, { mode: 'append_blocks' });
    } else {
      await this.smart_source.fs.rename(this.smart_source.data.path, target_source_key);
      await this.smart_source.collection.create_or_update({ path: target_source_key, content: current_content });
    }

    if (this.smart_source.key !== target_source_key) await this.remove();
  }

  async merge(content, opts = {}) {
    const { mode = 'append_blocks' } = opts;
    const { blocks } = await this.smart_source.smart_chunks.parse({
      content,
      file_path: this.smart_source.data.path,
    });

    if (!Array.isArray(blocks)) throw new Error("merge error: parse returned blocks that were not an array", blocks);

    blocks.forEach(block => {
      block.content = content
        .split("\n")
        .slice(block.lines[0], block.lines[1] + 1)
        .join("\n");

      const match = this.smart_source.blocks.find(b => b.key === block.path);
      if (match) {
        block.matched = true;
        match.matched = true;
      }
    });

    if (mode === "replace_all") {
      if (this.smart_source.env.smart_change) {
        let all = "";
        const new_blocks = blocks.sort((a, b) => a.lines[0] - b.lines[0]);
        if (new_blocks[0].lines[0] > 0) {
          all += content.split("\n").slice(0, new_blocks[0].lines[0]).join("\n");
        }
        for (let i = 0; i < new_blocks.length; i++) {
          const block = new_blocks[i];
          if (all.length) all += "\n";
          if (block.matched) {
            const og = this.smart_source.env.smart_blocks.get(block.path);
            all += this.smart_source.env.smart_change.wrap("content", {
              before: await og.read({ no_changes: "before", headings: "last" }),
              after: block.content,
              ...this.smart_source.smart_change_opts
            });
          } else {
            all += this.smart_source.env.smart_change.wrap("content", {
              before: "",
              after: block.content,
              ...this.smart_source.smart_change_opts
            });
          }
        }
        const unmatched_old = this.smart_source.blocks.filter(b => !b.matched);
        for (let i = 0; i < unmatched_old.length; i++) {
          const block = unmatched_old[i];
          all += (all.length ? "\n" : "") + this.smart_source.env.smart_change.wrap("content", {
            before: await block.read({ no_changes: "before", headings: "last" }),
            after: "",
            ...this.smart_source.smart_change_opts
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
          const to_block = this.smart_source.env.smart_blocks.get(block.path);
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

}
export class MarkdownBlockAdapter extends BlockAdapter {

  async read(opts = {}) {
    let content = await this.smart_block.source.read();
    content = content.split("\n");
    const skip_starts_with_heading = content[0].startsWith("#");
    content = content.slice(
      skip_starts_with_heading ? this.smart_block.line_start + 1 : this.smart_block.line_start,
      this.smart_block.line_end + 1
    ).join("\n");
    
    if (opts.no_changes && this.smart_block.env.smart_change) {
      const unwrapped = this.smart_block.env.smart_change.unwrap(content, {file_type: this.smart_block.file_type});
      content = unwrapped[opts.no_changes === 'after' ? 'after' : 'before'];
    }
    if (opts.headings) {
      content = this.prepend_headings(content, opts.headings);
    }
    if (opts.add_depth) {
      content = increase_heading_depth(content, opts.add_depth);
    }
    
    return content;
  }

  prepend_headings(content, mode) {
    const headings = this.smart_block.data.path.split('#').slice(1);
    let prepend_content = '';
    
    if (mode === 'all') {
      prepend_content = headings.map((h, i) => '#'.repeat(i + 1) + ' ' + h).join('\n');
    } else if (mode === 'last') {
      prepend_content = '#'.repeat(headings.length) + ' ' + headings[headings.length - 1];
    }
    
    return prepend_content + (prepend_content ? '\n' : '') + content;
  }

  async append(append_content) {
    let all_lines = (await this.smart_block.source.read()).split("\n");
    if(all_lines[this.smart_block.line_start] === append_content.split("\n")[0]){
      append_content = append_content.split("\n").slice(1).join("\n");
    }
    if(this.smart_block.env.smart_change) append_content = this.smart_block.env.smart_change.wrap("content", { before: "", after: append_content, ...this.smart_block.smart_change_opts });
    await this._append(append_content);
  }

  async _append(append_content) {
    let all_lines = (await this.smart_block.source.read()).split("\n");
    const content_before = all_lines.slice(0, this.smart_block.line_end + 1);
    const content_after = all_lines.slice(this.smart_block.line_end + 1);
    const new_content = [
      ...content_before,
      "", // add a blank line before appending
      append_content,
      ...content_after,
    ].join("\n").trim();
    await this.smart_block.source._update(new_content);
    await this.smart_block.source.parse_content();
  }

  async update(new_block_content, opts = {}) {
    if(this.smart_block.env.smart_change) new_block_content = this.smart_block.env.smart_change.wrap("content", {
      before: await this.read({ no_changes: "before", headings: "last" }),
      after: new_block_content,
      ...this.smart_block.smart_change_opts
    });
    await this._update(new_block_content);
  }

  async _update(new_block_content) {
    const full_content = await this.smart_block.source.read();
    const all_lines = full_content.split("\n");
    const new_content = [
      ...all_lines.slice(0, this.smart_block.line_start),
      new_block_content,
      ...all_lines.slice(this.smart_block.line_end + 1),
    ].join("\n");
    await this.smart_block.source._update(new_content);
    await this.smart_block.source.parse_content();
  }

  async remove() {
    if(this.smart_block.sub_blocks.length){
      // leave heading if has sub-blocks
      await this._update((await this.read({ no_changes: "before", headings: "last" })).split("\n")[0]);
    }else{
      await this._update("");
    }
    this.smart_block.delete();
  }

  async move_to(to_key) {
    const to_collection_name = to_key.includes("#") ? "smart_blocks" : "smart_sources";
    const to_entity = this.smart_block.env[to_collection_name].get(to_key);
    let content = await this.read({ no_changes: "before", headings: "last" });
    try {
      if(this.smart_block.env.smart_change){
        const smart_change = this.smart_block.env.smart_change.wrap('location', {
          to_key: to_key,
          before: await this.read({headings: 'last', no_change: 'before'}),
          ...this.smart_block.smart_change_opts
        });
        this._update(smart_change);
      }else{
        this.remove();
      }
    } catch (e) {
      console.warn("error removing block: ", e);
    }
    try {
      if(to_entity) {
        if(this.smart_block.env.smart_change){
          content = this.smart_block.env.smart_change.wrap("location", { from_key: this.smart_block.source.key, after: content, ...this.smart_block.smart_change_opts });
          await to_entity._append(content);
        }else{
          await to_entity.append(content);
        }
      } else {
        const target_source_key = to_key.split("#")[0];
        const target_source = this.smart_block.env.smart_sources.get(target_source_key);
        if (to_key.includes("#")) {
          const headings = to_key.split("#").slice(1);
          const new_headings_content = headings.map((heading, i) => `${"#".repeat(i + 1)} ${heading}`).join("\n");
          let new_content = [
              new_headings_content,
              ...content.split("\n").slice(1)
          ].join("\n").trim();
          if(this.smart_block.env.smart_change) new_content = this.smart_block.env.smart_change.wrap("location", { from_key: this.smart_block.source.key, after: new_content, ...this.smart_block.smart_change_opts });
          if(target_source) await target_source._append(new_content);
          else await this.smart_block.env.smart_sources.create(target_source_key, new_content);
        } else {
          if(this.smart_block.env.smart_change) content = this.smart_block.env.smart_change.wrap("location", { from_key: this.smart_block.source.key, after: content, ...this.smart_block.smart_change_opts });
          if(target_source) await target_source._append(content);
          else await this.smart_block.env.smart_sources.create(target_source_key, content);
        }
      }
    } catch (e) {
      console.warn("error moving block: ", e);
      // return to original location
      this.smart_block.deleted = false;
      await this.update(content);
    }
    await this.smart_block.source.parse_content();
  }
}
