import { SourceContentAdapter } from "./_adapter.js";
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
      hash: await this.create_hash(content),
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


  /**
   * TRANSFERRED FROM markdown.js (2024-12-13)
   * TODO NEEDS REVIEW/REFACTOR
   */
  async move_to(entity_ref) {
    const new_path = typeof entity_ref === "string" ? entity_ref : entity_ref.key;
    if (!new_path) {
      throw new Error("Invalid entity reference for move_to operation");
    }
  
    const current_content = await this.read();
    const [target_source_key, ...headings] = new_path.split("#");
    const target_source = this.item.collection.get(target_source_key);
  
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
      const parent_block = this.item.block_collection.get(block.parent_key);
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
    await this.update(new_content);
  }

}

export default {
  collection: null, // No collection adapter for this base file
  item: FileSourceContentAdapter
};