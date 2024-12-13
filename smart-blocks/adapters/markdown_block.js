/**
 * @file markdown_block.js
 * @description Handles block-level CRUD operations for markdown files.
 */

import { BlockContentAdapter } from "./_adapter.js";
import { markdown_to_blocks } from "../../smart-sources/blocks/markdown_to_blocks.js";

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
   * @param {Object} [opts={}] Optional parameters.
   * @returns {Promise<string>} The block content as a string.
   * @throws {Error} If the block cannot be found.
   */
  async block_read(opts = {}) {
    const source_content = await this.item.source.read();
    return this._extract_block(source_content);
  }

  /**
   * Append content to the existing block.
   * This method inserts additional lines after the block's end, then re-parses the file to update line references.
   * @async
   * @param {string} content Content to append to the block.
   * @returns {Promise<void>}
   * @throws {Error} If the block cannot be found.
   */
  async block_append(content) {
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
   * @param {string} new_block_content New content for the block.
   * @param {Object} [opts={}] Additional options.
   * @returns {Promise<void>}
   * @throws {Error} If the block cannot be found.
   */
  async block_update(new_block_content, opts = {}) {
    let full_content = await this.item.source.read();
    const { line_start, line_end } = this.item;
    if (!line_start || !line_end) {
      throw new Error(`Cannot update block ${this.item.key}: invalid line references.`);
    }

    const lines = full_content.split("\n");
    const updated_lines = [
      ...lines.slice(0, line_start - 1),
      ...new_block_content.split("\n"),
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
  async block_remove() {
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
  async block_move_to(to_key) {
    const block_content = await this.block_read();
    await this.block_remove();

    // Determine where to append the block_content
    // If to_key includes '#', treat as block reference (i.e., append to that block or heading)
    // Else treat as source file
    const is_block_ref = to_key.includes("#");
    let target_source_key = is_block_ref ? to_key.split("#")[0] : to_key;
    const target_source = this.item.env.smart_sources.get(target_source_key);

    if (!target_source) {
      // create new source if needed
      await this.item.env.smart_sources.create(target_source_key, block_content);
      return;
    }

    if (is_block_ref) {
      const target_block = this.item.env.smart_blocks.get(to_key);
      if (target_block) {
        await target_block.append(block_content);
      } else {
        // If no block, append to source at heading.
        await target_source.append(block_content);
      }
    } else {
      // Append to source directly
      await target_source.append(block_content);
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
    const { line_start, line_end } = this.item;
    if (!line_start || !line_end) {
      throw new Error(`BLOCK NOT FOUND: ${this.item.key} has invalid line references.`);
    }
    const lines = source_content.split("\n");
    const selected = lines.slice(line_start - 1, line_end);
    return selected.join("\n");
  }

  /**
   * Re-parse the source file after a CRUD operation to update line references for all blocks.
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async _reparse_source() {
    const source = this.item.source;
    const content = await source.read();
    await this.item.collection.import_source(source, content);
  }
}
