import { create_hash } from "./create_hash";
import { cos_sim } from "./cos_sim.js";
import { SmartEntity } from "./SmartEntity.js";

export class SmartSource extends SmartEntity {
  static get defaults() {
    return {
      data: {
        history: [], // array of { mtime, hash, length, blocks[] }
      },
      _embed_input: null, // stored temporarily
    };
  }
  async init() {
    const content = await this.get_content();
    const hash = await create_hash(content); // update hash
    if (hash !== this.last_history?.hash) {
      this.data.history.push({ blocks: {}, mtime: this.t_file.stat.mtime, size: this.t_file.stat.size, hash }); // add history entry
      this.data.embedding = {}; // clear embedding (DEPRECATED)
      this.data.embeddings = {}; // clear embeddings
    } else {
      this.last_history.mtime = this.t_file.stat.mtime; // update mtime
      this.last_history.size = this.t_file.stat.size; // update size
    }
    this.env.smart_blocks.import(this, { show_notice: false });
    this.queue_save();
  }
  async get_content() { return await this.env.cached_read(this.t_file); }
  async get_embed_input() {
    if (typeof this._embed_input === 'string' && this._embed_input.length) return this._embed_input; // return cached (temporary) input
    const content = await this.get_content(); // get content from file
    const breadcrumbs = this.data.path.split("/").join(" > ").replace(".md", "");
    const max_tokens = this.collection.smart_embed.max_tokens; // prevent loading too much content

    // console.log("max_tokens: ", max_tokens);
    this._embed_input = `${breadcrumbs}:\n${content}`.substring(0, max_tokens * 10);
    return this._embed_input;
  }
  find_connections() {
    let results = [];
    if (!this.vec && !this.median_block_vec) {
      // console.log(this);
      const start_embedding_btn = {
        text: "Start embedding",
        callback: () => {
          this.collection.import([this.t_file]).then(() => this.env.main.view.render_nearest(this));
        }
      };
      this.env.main.notices.show('no embedding found', `No embeddings found for ${this.name}.`, { confirm: start_embedding_btn });
      return results;
    }
    const smart_view_filter = this.env.plugin.settings.smart_view_filter;
    const filter = {};
    if (smart_view_filter?.include_exclude) {
      filter.exclude_key_starts_with_any = [this.key];
      if (smart_view_filter?.exclude_filter) filter.exclude_key_starts_with_any.push(smart_view_filter.exclude_filter);
      if (smart_view_filter?.include_filter) filter.key_starts_with = smart_view_filter.include_filter;
    } else {
      filter.exclude_key_starts_with = this.key;
    }
    if (smart_view_filter?.exclude_inlinks && this.env.links[this.data.path]) {
      if (!Array.isArray(filter.exclude_key_starts_with_any)) filter.exclude_key_starts_with_any = [];
      filter.exclude_key_starts_with_any = filter.exclude_key_starts_with_any.concat(Object.keys(this.env.links[this.data.path] || {}));
    }
    if (smart_view_filter?.exclude_outlinks && this.env.links[this.data.path]) {
      if (!Array.isArray(filter.exclude_key_starts_with_any)) filter.exclude_key_starts_with_any = [];
      filter.exclude_key_starts_with_any = filter.exclude_key_starts_with_any.concat(this.outlink_paths);
    }
    console.log("filter: ", filter);
    if (this.vec && this.median_block_vec && this.env.smart_blocks.smart_embed && this.collection.smart_embed) {
      console.log("FIND v1");
      const nearest_notes = this.env.smart_notes.nearest(this.vec, filter);
      const nearest_blocks = this.env.smart_blocks.nearest(this.median_block_vec, filter);
      results = nearest_blocks.concat(nearest_notes)
        // sort by item.score descending
        .sort((a, b) => {
          if (a.score === b.score) return 0;
          return (a.score > b.score) ? -1 : 1;
        });
    } else if (this.median_block_vec && this.env.smart_blocks.smart_embed) { // IS THIS EVER CALLED?
      console.log("FIND v2");
      const nearest_blocks = this.env.smart_blocks.nearest(this.median_block_vec, filter);
      // re-rank: sort by block note median block vec sim
      results = nearest_blocks
        .map(block => {
          if (!block.note?.median_block_vec.length) {
            block.score = block.sim;
            return block;
          }
          block.score = (block.sim + cos_sim(this.median_block_vec, block.note.median_block_vec)) / 2;
          return block;
        });
      const nearest_notes = this.env.smart_notes.nearest(this.vec, filter);
      results = results.concat(nearest_notes)
        // sort by item.score descending
        .sort((a, b) => {
          if (a.score === b.score) return 0;
          return (a.score > b.score) ? -1 : 1;
        });
    } else if (this.vec && this.collection.smart_embed) {
      console.log("FIND v3");
      const nearest_notes = this.env.smart_notes.nearest(this.vec, filter);
      results = nearest_notes
        // sort by item.score descending
        .sort((a, b) => {
          if (a.score === b.score) return 0;
          return (a.score > b.score) ? -1 : 1;
        });
    }
    return results;
  }
  open() { this.env.main.open_note(this.data.path); }
  get_block_by_line(line) { return this.blocks.find(block => block.data.lines[0] <= line && block.data.lines[1] >= line); }
  get block_vecs() { return this.blocks.map(block => block.vec).filter(vec => vec); } // filter out blocks without vec
  get blocks() { return Object.keys(this.last_history.blocks).map(block_key => this.env.smart_blocks.get(block_key)).filter(block => block); } // filter out blocks that don't exist
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }
  get meta_changed() {
    try {
      if (!this.last_history) return true;
      if (!this.t_file) return true;
      if ((this.last_history?.mtime || 0) < this.t_file.stat.mtime) {
        const size_diff = Math.abs(this.last_history.size - this.t_file.stat.size);
        console.log("mtime changed: ", this.last_history, this.t_file);
        const size_diff_ratio = size_diff / (this.last_history.size || 1);
        console.log("size diff ratio: ", size_diff_ratio);
        if (size_diff_ratio > 0.03) return true; // if size diff greater than 5% of last_history.size, assume file changed
      }
      // return (this.last_history.mtime !== this.t_file.stat.mtime) && (this.last_history.size !== this.t_file.stat.size);
      return false;
    } catch (e) {
      console.warn("error getting meta changed for ", this.data.path, ": ", e);
      return true;
    }
  }
  get is_canvas() { return this.data.path.endsWith("canvas"); }
  get is_excalidraw() { return this.data.path.endsWith("excalidraw.md"); }
  get is_gone() { return this.t_file === null; }
  get last_history() { return this.data.history.length ? this.data.history[this.data.history.length - 1] : null; }
  get mean_block_vec() { return this._mean_block_vec ? this._mean_block_vec : this._mean_block_vec = this.block_vecs.reduce((acc, vec) => acc.map((val, i) => val + vec[i]), Array(384).fill(0)).map(val => val / this.block_vecs.length); }
  get median_block_vec() { return this._median_block_vec ? this._median_block_vec : this._median_block_vec = this.block_vecs[0]?.map((val, i) => this.block_vecs.map(vec => vec[i]).sort()[Math.floor(this.block_vecs.length / 2)]); }
  get note_name() { return this.path.split("/").pop().replace(".md", ""); }
  get t_file() { return this.env.get_tfile(this.data.path); }
  // v2.2
  get ajson() {
    return [
      super.ajson,
      ...this.blocks.map(block => block.ajson).filter(ajson => ajson),
    ].join("\n");
  }
  get file_path() { return this.data.path; }
  get file_type() { return this.t_file.extension; }
  get outlink_paths() {
    return (this.data.outlinks || [])
      .filter(link => !link.target.startsWith("http"))
      .map(link => {
        const link_path = this.env.plugin.app.metadataCache.getFirstLinkpathDest(link.target, this.file_path)?.path;
        return link_path;
      })
      .filter(link_path => link_path);
  }
}
