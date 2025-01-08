import { TemplateSourceAdapter } from './_adapter.js';
import { parse_blocks } from 'smart-blocks/parsers/markdown.js';

/**
 * @class MarkdownTemplateAdapter
 * @extends TemplateSourceAdapter
 * @description
 * Adapter that reads a Markdown file, uses `parse_blocks` to find headings and content,
 * and populates `this.item.data` accordingly.
 */
export class MarkdownTemplateAdapter extends TemplateSourceAdapter {
  /** @type {string} The file extension this adapter targets. */
  static extension = 'md';
  extension = 'md';

  /**
   * @async
   * @method import
   * @description
   * 1) Read the markdown content
   * 2) Parse via `parse_blocks`
   * 3) Store heading => content mapping in `this.item.data.headings`
   * @returns {Promise<Object>} The headings data object
   */
  async import() {
    const markdownContent = await this.read();
    const blocksMap = parse_blocks(markdownContent);

    const headingsData = {};
    for (const [blockKey, [start, end]] of Object.entries(blocksMap)) {
      const lines = markdownContent.split('\n').slice(start - 1, end);
      const blockText = lines.join('\n').trim();
      if (!blockText) continue;

      // Clean the heading name from blockKey
      let headingName = blockKey.replace(/^#+/, '').trim() || '(root)';
      headingsData[headingName] = blockText;
    }

    // Store in item.data or merge if needed
    if (!this.item.data.headings) this.item.data.headings = {};
    Object.assign(this.item.data.headings, headingsData);

    return headingsData;
  }
}

export default {
  item: MarkdownTemplateAdapter
};
