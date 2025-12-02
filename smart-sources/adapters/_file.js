import { SourceContentAdapter } from "./_adapter.js";
import { parse_markdown_blocks } from "smart-blocks/parsers/markdown.js";
/**
 * @class FileSourceContentAdapter
 * @extends SourceContentAdapter
 * @classdesc
 * A base class for source-level content operations using a file system.
 * This adapter reads, writes, and removes source files on disk. It manages
 * hashing and last-read timestamps to track changes.
 *
 * **Intended Usage**:
 * - Extend this adapter for various file types (Markdown, Text) that rely
 *   on a standard file system backend.
 * - Override methods as necessary for custom file handling logic.
 */
export class FileSourceContentAdapter extends SourceContentAdapter {
  static async init_items(collection) {
    // If sub-classes already performed a run, skip:
    if (collection.fs_items_initialized) return;

    // Refresh or init the fs as needed:
    collection._fs = null; // Clear fs to reload exclusions
    await collection.fs.init();
    await collection.init_fs();

    // For each file recognized by this collection's fs,
    // let 'init_file_path' decide if extension is recognized:
    for (const file of Object.values(collection.fs.files)) {
      const item = collection.init_file_path(file.path);
      if(item) item.init_file_mtime = file.stat.mtime;
    }
    collection.fs_items_initialized = Date.now();
  }
  /**
   * @name fs
   * @type {Object}
   * @readonly
   * @description
   * Access the file system interface used by this adapter. Typically derived
   * from `this.item.collection.fs`.
   */
  get fs() {
    return this.item.collection.fs;
  }

  /**
   * @name file_path
   * @type {string}
   * @readonly
   * @description
   * The file path on disk corresponding to the source. Used for read/write operations.
   */
  get file_path() {
    return this.item.file_path;
  }

  /**
   * @async
   * @method create
   * @param {string|null} [content=null] Initial content for the new file.
   * @description
   * Create a new file on disk. If content is not provided, attempts to use
   * `this.item.data.content` as fallback.
   */
  async create(content=null) {
    if(!content) content = this.item.data.content || "";
    await this.fs.write(this.file_path, content);
  }

  /**
   * @async
   * @method update
   * @param {string} content The full new content to write to the file.
   * @description
   * Overwrite the entire file content on disk.
   */
  async update(content) {
    await this.fs.write(this.file_path, content);
  }

  /**
   * @async
   * @method read
   * @returns {Promise<string>} The content of the file.
   * @description
   * Read the file content from disk. Updates `last_read` hash and timestamp on the entity’s data.
   * If file is large or special handling is needed, override this method.
   */
  async read() {
    const content = await this.fs.read(this.file_path);
    this.data.last_read = {
      hash: this.create_hash(content || ""),
      at: Date.now(),
    };
    return content;
  }

  /**
   * @async
   * @method remove
   * @returns {Promise<void>}
   * @description
   * Delete the file from disk. After removal, the source item should also be deleted or updated accordingly.
   */
  async remove() {
    await this.fs.remove(this.file_path);
  }
  async move_to(move_to_ref) {
    if(!move_to_ref) {
      throw new Error("Invalid entity reference for move_to operation");
    }
    const move_content = await this.read();
    let has_existing = false;
    if(typeof move_to_ref === "string") {
      const existing = this.item.collection.get(move_to_ref);
      if(existing) {
        move_to_ref = existing;
        has_existing = true; // found existing entity
      }
    }else{
      has_existing = true; // passed in existing entity
    }
    if(has_existing){
      await move_to_ref.append(move_content);
    } else {
      move_to_ref = await this.item.collection.create(move_to_ref, move_content);
    }
    if(this.item.key !== move_to_ref.key){
      await this.remove();
      this.item.delete();
    }else{
      console.log(`did not delete ${this.item.key} because it was moved to ${move_to_ref.key}`);
    }
    return move_to_ref;
  }

  /**
   * Merge content into the source
   * @param {string} content - The content to merge into the source
   * @param {Object} opts - Options for the merge operation
   * @param {string} opts.mode - The mode to use for the merge operation. Defaults to 'append_blocks' (may also be 'replace_blocks')
   */
  async merge(content, opts = {}) {
    const { mode = 'append_blocks' } = opts;
    const {blocks: blocks_obj, task_lines} = parse_markdown_blocks(content);

    if (typeof blocks_obj !== 'object' || Array.isArray(blocks_obj)) {
      console.warn("merge error: Expected an object from parse_markdown_blocks, but received:", blocks_obj);
      throw new Error("merge error: parse_markdown_blocks did not return an object as expected.");
    }
    const { new_blocks, new_with_parent_blocks, changed_blocks, same_blocks } = await this.get_changes(blocks_obj, content);
    for(const block of new_blocks){
      await this.append(block.content);
    }
    for(const block of new_with_parent_blocks){
      const parent_block = this.item.block_collection.get(block.parent_key);
      await parent_block.append(block.content);
    }
    for(const block of changed_blocks){
      const changed_block = this.item.block_collection.get(block.key);
      if(mode === "replace_blocks"){
        await changed_block.update(block.content);
      } else {
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
      const block = this.item.block_collection.get(block_key);
      const content_hash = await this.create_hash(block_content);
      if(content_hash !== block.last_read?.hash){
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
    };
  }

  /**
   * Append new content to the source file, placing it at the end of the file.
   * @async
   * @param {string} content - The content to append.
   * @returns {Promise<void>}
   */
  async append(content) {
    const current_content = await this.read();
    const new_content = [
      current_content,
      "",
      content,
    ].join("\n").trim();

    await this.update(new_content);
  }
  get size() { return this.item.file?.stat?.size || 0; }
}

export default {
  collection: null, // No collection adapter for this base file
  item: FileSourceContentAdapter
};
