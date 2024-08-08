import { create_hash } from "./create_hash.js";
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
      this.data.embeddings = {}; // clear embeddings
    } else {
      this.last_history.mtime = this.t_file.stat.mtime; // update mtime
      this.last_history.size = this.t_file.stat.size; // update size
      if(!this.last_history.blocks) this.last_history.blocks = {};
    }
    // this.env.smart_blocks.import(this, { show_notice: false });
    const { blocks, outlinks } = await this.env.smart_chunks.parse(this);
    this.data.outlinks = outlinks;
    for(let i = 0; i < blocks.length; i++){
      const block = blocks[i];
      const item = this.env.smart_blocks.create_or_update(block);
      this.last_history.blocks[item.key] = true;
    }
    this.queue_save();
    if(this.is_unembedded) this.smart_embed.embed_entity(this);
  }
  get excluded_lines() {
    return this.blocks.filter(block => block.excluded).map(block => block.lines);
  }
  async get_content() { return await this.env.main.read_file(this.data.path); } // DECPRECATE for this.read?
  async get_embed_input() {
    if (typeof this._embed_input === 'string' && this._embed_input.length) return this._embed_input; // return cached (temporary) input
    let content = await this.get_content(); // get content from file
    if(this.excluded_lines.length){
      const content_lines = content.split("\n");
      this.excluded_lines.forEach(lines => {
        const {start, end} = lines;
        for(let i = start; i <= end; i++){
          content_lines[i] = "";
        }
      });
      content = content_lines.filter(line => line.length).join("\n");
    }
    const breadcrumbs = this.data.path.split("/").join(" > ").replace(".md", "");
    const max_tokens = this.collection.smart_embed.max_tokens; // prevent loading too much content
    this._embed_input = `${breadcrumbs}:\n${content}`.substring(0, max_tokens * 4);
    return this._embed_input;
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
        const size_diff_ratio = size_diff / (this.last_history.size || 1);
        if (size_diff_ratio > 0.01) return true; // if size diff greater than 1% of last_history.size, assume file changed
        // else console.log(`Smart Connections: Considering change of <1% (${size_diff_ratio * 100}%) "unchanged" for ${this.data.path}`);
      }
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
  get t_file() { return this.env.main.get_tfile(this.data.path); } // should be better handled using non-Obsidian API
  // v2.2
  get ajson() {
    if(this.deleted) return `${JSON.stringify(this.ajson_key)}: null`;
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
        const link_path = this.env.main.get_link_target_path(link.target, this.file_path);
        return link_path;
      })
      .filter(link_path => link_path);
  }
  get inlinks() { return Object.keys(this.env.links?.[this.data.path] || {}); }
  get size() { return this.last_history?.size || 0; }
  get mtime() { return this.last_history?.mtime || 0; }
  get is_unembedded() {
    if(this.meta_changed) return true;
    return super.is_unembedded;
  }
  get excluded() { return !this.env.is_included(this.data.path); }

  // FS
  async has_source_file() { return await this.fs.exists(this.data.path); }
  // CRUD
  async append(content) { await this.fs.append(this.data.path, content); }
  async update(content) { await this.fs.write(this.data.path, content); }
  async read() { return await this.fs.read(this.data.path); }
  async remove() {
    await this.fs.remove(this.data.path);
    this.delete();
  }
  async rename(new_path) {
    await this.fs.rename(this.data.path, new_path);
    this.data.key = new_path;
    this.data.path = new_path;
    this.data.embeddings = {}; // clear embeddings
    this.init();
  }
  // INCOMPLETE: MUST DECIDE IS INPUT SHOULD BE ENTITY OR KEY!!!!!!!!
  // async move(to_key){
  async move(to_entity){
    // const key_type = to_key.includes("#") ? "block" : "source";
    // if(key_type === "source"){
    if(to_entity.collection_name === "smart_sources"){
      // const to_entity = this.collection.get(to_key);
      if(to_entity?.has_source_file()){
        await to_entity.append(await this.read());
        await this.remove();
      }else{
        await this.rename(to_key);
      }
    }else{
      // should delete this entity
      throw new Error("Cannot move to block"); // TODO: Implement moving to block
    }
  }
  async merge(blocks){
    // TODO: Implement merging
    // appends blocks with matching headings in this.blocks
    // appends unmatched blocks to end of this content
  }
  async merge_to(entity){
    await entity.merge(this.blocks);
    await this.remove();
  }
  async merge_from(entity){
    await this.merge(entity.blocks);
    await entity.remove();
  }
}
