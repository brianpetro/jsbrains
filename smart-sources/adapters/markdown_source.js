import { FileSourceContentAdapter } from "./_file.js";
import { get_markdown_links } from "../utils/get_markdown_links.js";
import { parse_links } from "../content_parsers/parse_links.js";
import { parse_metadata } from "../content_parsers/parse_metadata.js";
import { parse_frontmatter } from "../utils/parse_frontmatter.js";
/**
 * @class MarkdownSourceContentAdapter
 * @extends FileSourceContentAdapter
 * @description
 * Adapter for handling a SmartSource that is backed by a Markdown file.
 * Responsible for importing file content into `item.data.blocks`, computing hashes, and identifying outlinks.
 */
export class MarkdownSourceContentAdapter extends FileSourceContentAdapter {
  static extensions = ['md', 'txt'];
  /**
   * Import the source file content, parse blocks and links, and update `item.data`.
   * @async
   * @returns {Promise<void>}
   */
  async import() {
    if(!this.can_import) return;
    if(!this.should_import) return;
    const content = await this.read();
    if (!content) {
      console.warn(`No content to import for ${this.file_path}`);
      return;
    }
    // TODO: should be dynamic: ex. content_parsers files export a should_parse function
    if(this.data.last_import?.hash === this.data.last_read?.hash){
      if(this.data.blocks) return; // if blocks already exist, skip re-import
    }
    await this.parse_content(content);
    await this.item.parse_content(content);

    // Mark last_import
    const { mtime, size } = this.item.file.stat;
    this.data.last_import = {
      mtime,
      size,
      at: Date.now(),
      hash: this.data.last_read.hash,
    };
    this.item.loaded_at = Date.now();

    // also queue saving
    this.item.queue_save();
    // queue embed
    this.item.queue_embed();
  }

  // Runs before configured content_parsers (for example, templates uses outlinks)
  async parse_content(content) {
    await parse_links(this.item, content);
    await parse_metadata(this.item, content);
  }

  async get_links(content=null) {
    if(!content) content = await this.read();
    if(!content) return;
    return get_markdown_links(content);
  }

  async get_metadata(content=null) {
    if(!content) content = await this.read();
    if(!content) return;
    const {frontmatter} = parse_frontmatter(content);
    return frontmatter;
  }


  // Erroneous reasons to skip import (logs to console)
  get can_import() {
    if(!this.item.file){
      console.warn(`MarkdownSourceContentAdapter: Skipping missing-file: ${this.file_path}`);
      return false;
    }
    if(this.item.file_type !== 'md') {
      // console.warn(`MarkdownSourceContentAdapter: Skipping non-markdown file: ${this.file_path}`);
      return false;
    }
    if(this.item.size > 1000000) {
      // console.warn(`MarkdownSourceContentAdapter: Skipping large file: ${this.file_path}`);
      return false;
    }
    // Skip if no changes
    return true;
  }

  /**
   * @deprecated use outdated instead
   */
  get should_import() {
    return this.outdated;
  }
  get outdated() {
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

export default {
  collection: null, // No collection adapter needed for markdown sources
  item: MarkdownSourceContentAdapter
};