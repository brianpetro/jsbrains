import { increase_heading_depth } from "../utils/increase_heading_depth.js";
import { SourceAdapter } from "./_adapter.js";

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