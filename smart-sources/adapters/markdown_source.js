import { FileSourceContentAdapter } from "./_file.js";
import { markdown_to_blocks } from "../blocks/markdown_to_blocks.js";
import { get_markdown_links } from "../utils/get_markdown_links.js";

/**
 * @class MarkdownSourceContentAdapter
 * @extends FileSourceContentAdapter
 * @description
 * Adapter for handling a SmartSource that is backed by a Markdown file.
 * Responsible for importing file content into `item.data.blocks`, computing hashes, and identifying outlinks.
 */
export class MarkdownSourceContentAdapter extends FileSourceContentAdapter {
  /**
   * Import the source file content, parse blocks and links, and update `item.data`.
   * @async
   * @returns {Promise<void>}
   */
  async import() {
    if(!this.can_import) return;
    if(!this.should_import) return;
    const content = await this.read(); // updates last_read.hash
    if (!content) {
      console.warn(`No content to import for ${this.file_path}`);
      return;
    }
    if(this.data.last_import?.hash === this.data.last_read?.hash){
      if(this.data.blocks) return; // if blocks already exist, skip re-import
    }

    const outlinks = get_markdown_links(content);
    this.data.outlinks = outlinks;

    this.data.last_import = {
      mtime: this.item.mtime,
      size: this.item.size,
      at: Date.now(),
      hash: this.data.last_read.hash,
    }
    this.item.loaded_at = Date.now();

    // import blocks
    if(this.item.block_collection){
      await this.item.block_collection.import_source(this.item, content);
    }

    // Queue embedding
    await this.item.get_embed_input(content);
    this.item.queue_embed();
  }

  // Erroneous reasons to skip import (logs to console)
  get can_import() {
    if(!this.item.file){
      console.warn(`MarkdownSourceContentAdapter: Skipping missing-file: ${this.file_path}`);
      return false;
    }
    if(this.item.file_type !== 'md') {
      console.warn(`MarkdownSourceContentAdapter: Skipping non-markdown file: ${this.file_path}`);
      return false;
    }
    if(this.item.size > 1000000) {
      console.warn(`MarkdownSourceContentAdapter: Skipping large file: ${this.file_path}`);
      return false;
    }
    // Skip if no changes
    return true;
  }

  get should_import() {
    try{
      if(!this.data.last_import){
        // temp for backwards compatibility 2024-12-12
        if(this.data.mtime && this.data.size && this.data.hash){
          this.data.last_import = {
            mtime: this.data.mtime,
            size: this.data.size,
            at: Date.now(),
            hash: this.data.hash,
          }
          delete this.data.mtime;
          delete this.data.size;
          delete this.data.hash;
        }else{
          return true;
        }
        // FUTURE: remove above and return true if no last_import
        // return true;
      }
      if(this.data.last_read.at > this.data.last_import.at){
        if(this.data.last_import?.hash !== this.data.last_read?.hash) return true;
      }
      if(this.data.last_import.mtime < this.item.mtime){
        if(!this.data.last_import.size) return true;
        const size_diff = Math.abs(this.data.last_import.size - this.item.size);
        const size_diff_ratio = size_diff / (this.data.last_import.size || 1);
        if (size_diff_ratio > 0.01) return true; // if size diff greater than 1% of this.data.size, assume file changed
      }
      return false;
    }catch(e){
      console.warn(`MarkdownSourceContentAdapter: error getting should_import for ${this.file_path}: ${e}`);
      return true; // should this be true?
    }
  }

}