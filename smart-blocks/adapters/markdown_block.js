/**
 * @file markdown_block.js
 * @description Handles block-level CRUD operations for markdown files.
 */

import { BlockContentAdapter } from "./_adapter.js";
import { get_line_range } from "smart-sources/utils/get_line_range.js";

/**
 * @class MarkdownBlockContentAdapter
 * @extends BlockContentAdapter
 * @classdesc Adapter class that provides CRUD operations for a SmartBlock in a Markdown file.
 * Responsible for reading, updating, appending, removing, and moving blocks within a markdown source file.
 *
 * This adapter uses line references (start/end) stored in the block's data to locate and manipulate the block within the source file.
 */
export class MarkdownBlockContentAdapter extends BlockContentAdapter {
  /**
   * Read the content of the block.
   * @async
   * @returns {Promise<string>} The block content as a string.
   * @throws {Error} If the block cannot be found.
   */
  async read() {
    const source_content = await this.item.source?.read();
    if(!source_content) {
      console.warn(`BLOCK NOT FOUND: ${this.item.key} has no source content.`);
      return "";
    }
    const content = this._extract_block(source_content);
    this.update_last_read(content);
    return content;
  }

  /**
   * Append content to the existing block.
   * This method inserts additional lines after the block's end, then re-parses the file to update line references.
   * @async
   * @param {string} content Content to append to the block.
   * @returns {Promise<void>}
   * @throws {Error} If the block cannot be found.
   */
  async append(content) {
    let full_content = await this.item.source.read();
    const { line_start, line_end } = this.item;

    if (!line_start || !line_end) {
      throw new Error(`Cannot append to block ${this.item.key}: invalid line references.`);
    }

    const lines = full_content.split("\n");
    // Insert a blank line before appending if needed
    lines.splice(line_end, 0, "", content);
    const updated_content = lines.join("\n");

    await this.item.source._update(updated_content);
    await this._reparse_source();
  }

  /**
   * Update the block with new content, replacing its current lines.
   * @async
   * @param {string} new_content New content for the block.
   * @param {Object} [opts={}] Additional options.
   * @returns {Promise<void>}
   * @throws {Error} If the block cannot be found.
   */
  async update(new_content, opts = {}) {
    let full_content = await this.item.source.read();
    const { line_start, line_end } = this.item;
    if (!line_start || !line_end) {
      throw new Error(`Cannot update block ${this.item.key}: invalid line references.`);
    }

    const lines = full_content.split("\n");
    const updated_lines = [
      ...lines.slice(0, line_start - 1),
      ...new_content.split("\n"),
      ...lines.slice(line_end)
    ];
    const updated_content = updated_lines.join("\n");

    await this.item.source._update(updated_content);
    await this._reparse_source();
  }

  /**
   * Remove the block entirely from the source.
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If the block cannot be found.
   */
  async remove() {
    let full_content = await this.item.source.read();
    const { line_start, line_end } = this.item;
    if (!line_start || !line_end) {
      throw new Error(`Cannot remove block ${this.item.key}: invalid line references.`);
    }

    const lines = full_content.split("\n");
    const updated_lines = [
      ...lines.slice(0, line_start - 1),
      ...lines.slice(line_end)
    ];
    const updated_content = updated_lines.join("\n");

    await this.item.source._update(updated_content);
    await this._reparse_source();
  }

  /**
   * Move the block to a new location (another source or heading).
   * This involves reading the block content, removing it from the current source, and appending it to the target.
   * @async
   * @param {string} to_key The destination path or entity reference.
   * @returns {Promise<void>}
   * @throws {Error} If the block or target is invalid.
   */
  async move_to(to_key) {
    const content = await this.read();
    await this.remove();

    // Determine where to append the content
    // If to_key includes '#', treat as block reference (i.e., append to that block or heading)
    // Else treat as source file
    const is_block_ref = to_key.includes("#");
    let target_source_key = is_block_ref ? to_key.split("#")[0] : to_key;
    const target_source = this.item.env.smart_sources.get(target_source_key);

    if (!target_source) {
      // create new source if needed
      await this.item.env.smart_sources.create(target_source_key, content);
      return;
    }

    if (is_block_ref) {
      const target_block = this.item.env.smart_blocks.get(to_key);
      if (target_block) {
        await target_block.append(content);
      } else {
        // If no block, append to source at heading.
        await target_source.append(content);
      }
    } else {
      // Append to source directly
      await target_source.append(content);
    }
  }

  /**
   * Extract the block content using current line references from a full source content.
   * @private
   * @param {string} source_content Full source file content.
   * @returns {string} Extracted block content.
   * @throws {Error} If the block cannot be found.
   */
  _extract_block(source_content) {
    if(!source_content){
      console.warn(`BLOCK NOT FOUND: ${this.item.key} has no source content.`);
      return "";
    }
    const { line_start, line_end } = this.item;
    if (!line_start || !line_end) {
      throw new Error(`BLOCK NOT FOUND: ${this.item.key} has invalid line references.`);
    }
    return get_line_range(source_content, line_start, line_end);
  }

  /**
   * Re-parse the source file after a CRUD operation to update line references for all blocks.
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async _reparse_source() {
    await this.item.source.import();
  }

  get_display_name(params = {}) {
    if (!this.item?.key) return '';
    const show_full_path = params.show_full_path ?? true;
    if(show_full_path) {
      return this.item.key.replace(/#/g, ' > ').replace(/\//g, ' > ');
    }
    const pcs = [];
    const [source_key, ...block_parts] = this.item.key.split('#');
    const filename = source_key.split('/').pop();
    pcs.push(filename);
    if (block_parts.length) {
      const last = block_parts[block_parts.length - 1];
      if(last.startsWith('{') && last.endsWith('}')) {
        block_parts.pop();
        pcs.push(block_parts.pop());
        if(this.item.lines) pcs.push(`Lines: ${this.item.lines.join('-')}`);
      }else{
        pcs.push(block_parts.pop());
      }
    }
    return pcs.filter(Boolean).join(' > ');
  }
}

export default {
  collection: null, // No collection adapter needed for markdown blocks
  item: MarkdownBlockContentAdapter
};
