import { MarkdownSourceContentAdapter } from "./markdown_source.js";

export class ObsidianMarkdownSourceContentAdapter extends MarkdownSourceContentAdapter {
  async get_metadata() {
    const app = this.item.env.main.app;
    const {frontmatter} = app.metadataCache.getFileCache(this.item.file);
    return frontmatter;
  }
}

export default {
  collection: null, // No collection adapter needed for markdown sources
  item: ObsidianMarkdownSourceContentAdapter
};