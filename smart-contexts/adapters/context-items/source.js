import { ContextItemAdapter } from './_adapter.js';
import { strip_excluded_headings } from 'smart-contexts/utils/respect_exclusions.js';
import { get_markdown_links } from 'smart-sources/utils/get_markdown_links.js';

export class SourceContextItemAdapter extends ContextItemAdapter {
  static order = 7; // default lowest priority
  static detect(key) { return true; }

  get ref() { return this.env.smart_sources.get(this.item.key); }
  get inlinks() { return this.ref.inlinks || []; }
  get outlinks() { return this.ref.outlinks || []; }
  get exists() { return !!(this.ref && !this.ref.is_gone); }

  get size () {
    return this.ref?.size || 0;
  }

  // DEPRECATED METHODS
  /**
   * @deprecated in favor of get_text and get_media 
   */
  async add_to_snapshot(snapshot, opts = {}) {
    let raw = await this.ref.read();
    if (!opts.calculating && raw.split('\n').some(line => line.startsWith('```dataview'))) {
      raw = await this.ref.read({ render_output: true });
      this.ref.data.outlinks = get_markdown_links(raw);
    }
    const [content, exclusions, excluded_char_count] =
      strip_excluded_headings(raw, opts.excluded_headings ?? []);
    if (!snapshot.items) snapshot.items = [];
    if (!snapshot.items[0]) snapshot.items[0] = {};
    snapshot.items[0][this.item.key] = {
      ref: this.ref,
      path: this.item.key,
      mtime: this.ref.mtime,
      content,
      char_count: content.length,
      exclusions,
      excluded_char_count,
    };
    snapshot.char_count += content.length;
  }
  /**
   * @deprecated in favor of context-suggest actions
   */
  async find_connections(opts = {}) {
    return await this.ref.find_connections(opts);
  }
}
