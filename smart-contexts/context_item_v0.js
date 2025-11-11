import { strip_excluded_headings } from './utils/respect_exclusions.js';
import { get_markdown_links }       from 'smart-sources/utils/get_markdown_links.js';

/**
 * @deprecated use CollectionItem subclasses in context_item.js
 */
export class BaseContextItem {
  constructor (ctx, key) {
    ctx.env.create_env_getter(this);
    this.ctx  = ctx;
    this.key  = key;

    /* inline content (if any) */
    const ctx_data = ctx.data?.context_items?.[key];
    if (ctx_data && typeof ctx_data === 'object' && 'content' in ctx_data) {
      this.content = String(ctx_data.content ?? '');
    }
  }
  get name () {
    return this.path.split('/').pop();
  }

  /**
   * @deprecated use key
   */
  get path () {
    return this.key;
  }

  get exists () {
    return true;
  }

  /* fallback empty link arrays so link‑depth traversal works */
  get inlinks  () { return this._inlinks ?? []; }
  get outlinks () { return this._outlinks ?? []; }
  set inlinks(links) {
    this._inlinks = Array.isArray(links) ? links : [];
  }
  set outlinks(links) {
    links = links
      .map(link => {
        const link_ref = link?.target || link;
        if(link_ref.startsWith("http")) return null;
        const link_path = this.env.smart_sources.fs.get_link_target_path(link_ref, this.key);
        return link_path;
      })
      .filter(link_path => link_path);
    this._outlinks = Array.isArray(links) ? links : [];
  }

  async add_to_snapshot (snapshot, opts = {}) {
    if (typeof this.content !== 'string') return;          // nothing to do

    this.outlinks = get_markdown_links(this.content);

    const [clean, exclusions, excluded_char_count] =
      strip_excluded_headings(this.content, opts.excluded_headings ?? []);

    const depth = opts.depth || 0;
    if (!snapshot.items[depth]) snapshot.items[depth] = {};

    snapshot.items[depth][this.key] = {
      path       : this.key,
      content    : clean,
      char_count : clean.length,
      mtime      : Date.now(), // inline items have no mtime
      exclusions,
      excluded_char_count,
      inlinks    : this.inlinks,
      outlinks   : this.outlinks,
    };

    snapshot.char_count += clean.length;
  }

  async find_connections(opts = {}) {
    return await this.env.smart_sources.lookup({hypotheticals: [
      this.data.content
    ]})
  }

}

export class SourceContextItem extends BaseContextItem {
  constructor(context, ref) { super(context, ref.key); this.ref = ref; }
  get inlinks() {
    return this.ref.inlinks || [];
  }
  get outlinks() {
    return this.ref.outlinks || [];
  }
  get exists () {
    return !!(this.ref && !this.ref?.is_gone);
  }
  async add_to_snapshot(snapshot, opts) {
    let raw = await this.ref.read();
    if (!opts.calculating && raw.split('\n').some(line => line.startsWith('```dataview'))) {
      raw = await this.ref.read({ render_output: true });
      this.ref.data.outlinks = get_markdown_links(raw);
    }
    const [content, exclusions, excluded_char_count] =
      strip_excluded_headings(raw, opts.excluded_headings ?? []);
    if (!snapshot.items) snapshot.items = [];
    if (!snapshot.items[0]) snapshot.items[0] = {};
    snapshot.items[0][this.path] = {
      ref        : this.ref,
      path       : this.path,
      mtime      : this.ref.mtime,
      content,
      char_count : content.length,
      exclusions,
      excluded_char_count,
    };
    snapshot.char_count += content.length;
  }
  async find_connections(opts={}) {
    return await this.ref.find_connections(opts);
  }
}

export class ImageContextItem extends BaseContextItem {
  async add_to_snapshot(snapshot/* , opts */) {
    if(!snapshot.images) snapshot.images = [];
    snapshot.images.push(this.path);
  }
}

export class PdfContextItem extends BaseContextItem {
  async add_to_snapshot(snapshot/* , opts */) {
    if(!snapshot.pdfs) snapshot.pdfs = [];
    snapshot.pdfs.push(this.path);
  }
}