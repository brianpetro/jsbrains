// Copyright (c) Brian Joseph Petro

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const { Collection } = require("smart-collections/Collection"); // npm
const { CollectionItem } = require("smart-collections/CollectionItem"); // npm
class SmartEntities extends Collection {
  constructor(env, opts) {
    super(env, opts);
    this.env = env; // env is the brain (brain is Deprecated)
    this._pause_embeddings = false; // used to pause ensure_embeddings
  }
  async _save() { await this.adapter._save_queue(); } // async b/c Obsidian API is async
  replacer(key, value) { // JSON.stringify replacer
    if(value instanceof this.item_type){
      if(!value.validate_save()){
        console.log("Invalid block, skipping save: ", value.data);
        return undefined; // skip if invalid
      }
      // if(value.data.embedding.vec && value.data.text) value.data.text = undefined; // clear text if embedding exists
      if(value.data.embeddings?.[this.embed_model]?.vec && value.data.text) value.data.text = undefined; // clear text if embedding exists
      return value.data;
    }
    return super.replacer(key, value);
  }
  unload(){
    if(typeof this.smart_embed?.unload === 'function'){
      this.smart_embed.unload();
      delete this.smart_embed;
    }
  }
  async load() {
    await super.load(); // MUST RUN BEFORE SMART EMBED async b/c Obsidian API is async
    console.log(this);
    console.log(this.env);
    await this.load_smart_embed();
  }
  get SmartEmbedModel() { return this.env.modules.SmartEmbedModel; }
  async load_smart_embed() {
    if(!this.SmartEmbedModel) return console.log("SmartEmbedModel must be included in the `env.modules` property");
    // console.log("Loading SmartEmbed for " + this.collection_name + " Model: " + this.smart_embed_model);
    if(this.smart_embed_model === "None") return; // console.log("SmartEmbed disabled for ", this.collection_name);
    if(this.env.smart_embed_active_models[this.smart_embed_model] instanceof this.SmartEmbedModel){
      this.smart_embed = this.env.smart_embed_active_models[this.smart_embed_model];
      console.log("SmartEmbed already loaded for " + this.collection_name + ": Model: " + this.smart_embed_model);
    }else{
      const model = {model_key: this.smart_embed_model};
      if(this.smart_embed_model.includes("/")) { // TODO: better way to detect local model
        console.log(this.env.local_model_type);
        this.model_key = this.smart_embed_model;
        const local_max = this.env.config.local_embedding_max_tokens;
        if(local_max < model.max_tokens) model.max_tokens = local_max;
        // check if http://localhost:37420/embed is available
        console.log('Checking for local Smart Connect server...');
        try{
          const request_adapter = this.env.main.obsidian?.requestUrl || null;
          const sc_local = !request_adapter ? await fetch('http://localhost:37421/') : await request_adapter({url: 'http://localhost:37421/', method: 'GET'});
          // console.log(sc_local);
          if(sc_local.status === 200) {
            console.log('Local Smart Connect server found');
            this.smart_embed = await this.SmartEmbedModel.create(this.env, {...model, request_adapter: request_adapter, adapter: 'local_api', local_endpoint: 'http://localhost:37421/embed_batch'});
            return;
          }
        }catch(err){
          console.log('Could not connect to local Smart Connect server');
        }
        if(this.env.local_model_type === 'Web'){
          this.model_key += '_web'; // model registry name
          if(this.smart_embed) console.log(`Existing WebAdapter for ${this.collection_name} model: ${this.smart_embed_model}`);
          else this.smart_embed = await this.SmartEmbedModel.create(this.env, {...model, adapter: 'iframe', container: this.smart_embed_container});
        }else{
          this.model_key += '_node'; // model registry name
          if(this.smart_embed) console.log(`Existing NodeAdapter for ${this.collection_name} model: ${this.smart_embed_model}`); // Check if a connection for this model already exists
          else this.smart_embed = await this.SmartEmbedModel.create(this.env, {...model, adapter: 'transformers'});
        }
      } else { // is API model
        this.model_key += '_api'; // model registry name
        if(this.smart_embed) console.log(`Existing ApiAdapter for ${this.collection_name} model: ${this.smart_embed_model}`); // Check if a connection for this model already exists
        else this.smart_embed = await this.SmartEmbedModel.create(this.env, {...model, request_adapter: this.env.main.obsidian?.requestUrl, api_key: this.config.api_key});
      }
    }
  }
  get smart_embed_container() {
    if(!this.model_key) return console.log('model_key not set');
    const id = this.model_key.replace(/[^a-zA-Z0-9]/g, '_');
    if(!window.document) return console.log('window.document not available');
    if(window.document.querySelector(`#${id}`)) return window.document.querySelector(`#${id}`);
    const container = window.document.createElement('div');
    container.id = id;
    window.document.body.appendChild(container);
    return container;
  }
  get smart_embed() { return this.env.active_embed_models?.[this.model_key]; }
  set smart_embed(val) {
    if(!this.model_key) this.model_key = val.model_name + "_" + val.constructor.name;
    if(!this.env.active_embed_models) this.env.active_embed_models = {};
    this.env.active_embed_models[this.model_key] = val;
  }
  pause_embedding() {
    this._pause_embeddings = true;
    this.env.main.notices.remove('embedding progress');
  }
  async ensure_embeddings(show_notice = null) {
    console.log("ensure_embeddings");
    if(!this.smart_embed) return console.log("SmartEmbed not loaded for " + this.collection_name);
    const unembedded_items = this.unembedded_items; // gets all without vec
    if(unembedded_items.length === 0) return true; // skip if no unembedded items
    console.log("unembedded_items: ", unembedded_items);
    const performance_notice_msg = "(This is a resource intensive operation)";
    if((show_notice !== false) && (unembedded_items.length > 30)) {
      const start_btn = {text: "Start embedding", callback: () => this.ensure_embeddings(false) };
      this.env.main.notices.show('start embedding', [`Are you ready to begin embedding ${unembedded_items.length} ${this.collection_name}?`, performance_notice_msg], { timeout: 0, confirm: start_btn});
      return false;
    }
    if(this.is_embedding) return console.log('already embedding');
    this.is_embedding = true;
    const batch_size = this.smart_embed.batch_size;
    this.env.main.notices.remove('start embedding');
    let total_tokens = 0;
    let time_start = Date.now();
    let time_elapsed = 0;
    let tokens_per_sec = 0;
    for(let i = 0; i < unembedded_items.length; i += batch_size) {
      // console.log("i: ", i);
      if(this._pause_embeddings) {
        // console.log("pause_embeddings");
        this._pause_embeddings = false;
        const restart_btn = {text: "Restart", callback: () => this.ensure_embeddings() };
        this.env.main.notices.show('restart embedding', [`Embedding ${this.collection_name}...`, `Paused at ${i} / ${unembedded_items.length} ${this.collection_name}`, performance_notice_msg], { timeout: 0, button: restart_btn});
        this.adapter._save_queue(); // save immediately, overwrites existing file
        this.is_embedding = false;
        return;
      }
      if(i % 10 === 0){
        const pause_btn = {text: "Pause", callback: () => this.pause_embedding(), stay_open: true};
        this.env.main.notices.show('embedding progress', [`Embedding ${this.collection_name}...`, `Progress: ${i} / ${unembedded_items.length} ${this.collection_name}`, `${tokens_per_sec} tokens/sec`, performance_notice_msg], { timeout: 0, button: pause_btn, immutable: true});
      }
      const items = unembedded_items.slice(i, i + batch_size);
      await Promise.all(items.map(async item => await item.get_embed_input())); // make sure all items have embed_input (in cache for call by embed_batch)
      const resp = await this.smart_embed.embed_batch(items);
      // console.log("resp: ", resp);
      items.forEach(item => {
        item._embed_input = null; // clear _embed_input cache after embedding
        item.queue_save();
      });
      total_tokens += resp.reduce((acc, item) => acc + item.tokens, 0);
      time_elapsed = Date.now() - time_start;
      tokens_per_sec = Math.round(total_tokens / (time_elapsed / 1000));
      // console.log(items.filter(i => !i.vec).map(item => item));
      if(i && (i % 500 === 0)){
        // console.log(unembedded_items[i]);
        await this.adapter._save_queue();
      }
      // console.log("done i: ", i);
    }
    if(this.env.main._notice?.noticeEl?.parentElement) this.env.main._notice.hide();
    const embedded_ct = unembedded_items.filter(i => i.vec).length;
    // console.log(unembedded_items.map(i => i.key));
    this.env.main.notices.remove('embedding progress');
    this.env.main.notices.show('done embedding', [`Embedding ${this.collection_name}...`, `Done creating ${embedded_ct} embeddings.`], { timeout: 10000 });
    if(unembedded_items.length) this.adapter._save_queue();
    this.is_embedding = false;
    return true;
  }
  get embedded_items() { return this.smart_embed ? Object.values(this.items).filter(i => i.vec) : Object.values(this.items); }
  get unembedded_items() { return this.smart_embed ? Object.values(this.items).filter(item => !item.vec) : []; }

  nearest(vec, filter={}) {
    if(!vec) return console.log("no vec");
    const {
      results_count = 50, // DO: default configured in settings
    } = filter;
    const nearest = this.filter(filter)
      .reduce((acc, item) => {
        if(!item.vec) return acc; // skip if no vec
        item.score = cos_sim(vec, item.vec);
        item.sim = item.score; // DEPRECATED alias
        top_acc(acc, item, results_count); // update acc
        return acc;
      }, { min: 0, items: new Set() })
    ;
    return Array.from(nearest.items);
  }
  get file_name() { return this.collection_name + '-' + this.smart_embed_model.split("/").pop(); }
  get smart_embed_model() { return this.config[this.collection_name + "_embed_model"]; }
}
class SmartEntity extends CollectionItem {
  static get defaults() {
    return {
      data: {
        path: null,
        embeddings: {}, // contains keys per model
        embedding: {}, // DEPRECATED
      },
    };
  }
  get_key() { return this.data.path; }
  // DO: clarified/improved logic
  save() {
    this.collection.set(this);
    this.env.save();
  }
  get_nearest(filter={}) { /* TODO */ }
  async get_as_context(params = {}) {
    return `---BEGIN NOTE${params.i ? " " + params.i : ""} [[${this.path}]]---\n${await this.get_content()}\n---END NOTE${params.i ? " " + params.i : ""}---`;
  }
  async get_content() {} // override in child class
  async get_embed_input() {} // override in child class
  // getters
  get embed_link() { return `![[${this.data.path}]]`; }
  get multi_ajson_file_name() { return (this.path.split("#").shift()).replace(/[\s\/\.]/g, '_').replace(".md", ""); }
  get name() { return (!this.env.main.settings.show_full_path ? this.path.split("/").pop() : this.path.split("/").join(" > ")).split("#").join(" > ").replace(".md", ""); }
  get path() { return this.data.path; }
  get tokens() { return this.data.embeddings[this.embed_model]?.tokens; }
  get embed_model() { return this.collection.smart_embed_model; }
  get vec() { return this.data?.embeddings?.[this.embed_model]?.vec; }
  get embedding() { return this.data.embeddings?.[this.embed_model]; }
  // setters
  set embedding(embedding) {
    if(!this.data.embeddings) this.data.embeddings = {};
    this.data.embeddings[this.embed_model] = embedding;
  }
  set error(error) { this.data.embeddings[this.embed_model].error = error; }
  set tokens(tokens) {
    if(!this.embedding) this.embedding = {};
    this.embedding.tokens = tokens;
  }
  set vec(vec) {
    if(!this.embedding) this.embedding = {};
    this.data.embeddings[this.embed_model].vec = vec;
  }
}
// COSINE SIMILARITY
function cos_sim(vector1, vector2) {
  const dotProduct = vector1.reduce((acc, val, i) => acc + val * vector2[i], 0);
  const normA = Math.sqrt(vector1.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vector2.reduce((acc, val) => acc + val * val, 0));
  return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
}
function top_acc(_acc, item, ct = 10) {
  if (_acc.items.size < ct) {
    _acc.items.add(item);
  } else if (item.sim > _acc.min) {
    _acc.items.add(item);
    _acc.items.delete(_acc.minItem);
    _acc.minItem = Array.from(_acc.items).reduce((min, curr) => (curr.sim < min.sim ? curr : min));
    _acc.min = _acc.minItem.sim;
  }
}

exports.SmartEntity = SmartEntity;
exports.SmartEntities = SmartEntities;
exports.cos_sim = cos_sim;

// DO: Extract to separate files
class SmartNotes extends SmartEntities {
  async import(files, opts= {}) {
    try{
      let batch = [];
      const timeoutDuration = 10000; // Timeout duration in milliseconds (e.g., 10000 ms for 10 seconds)
      let i = 0;
      for(i = 0; i < files.length; i++){
        if(batch.length % 10 === 0){
          this.env.main.notices.show('initial scan progress', [`Making Smart Connections...`, `Progress: ${i} / ${files.length} files`], { timeout: 0 });
          // Promise.race to handle timeout
          const batchPromise = Promise.all(batch);
          const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('Batch processing timed out'));
            }, timeoutDuration);
          });
          try {
            await Promise.race([batchPromise, timeoutPromise]);
          } catch (error) {
            console.error('Batch processing error:', error);
            // log files paths that were in batch via files
            const files_in_batch = files.slice(i - batch.length, i);
            console.log(files_in_batch.map(file => file.path));
            // Handle timeout or other errors here
          }
          batch = [];
        }
        const note = this.get(files[i].path);
        if(!note) batch.push(this.create_or_update({ path: files[i].path }));
        else{
          if(note.meta_changed){
            console.log("note meta changed: ", note);
            note.data.embeddings = {};
            batch.push(this.create_or_update({ path: files[i].path }));
          }else if(this.env.smart_blocks?.smart_embed){
            batch.push(this.env.smart_blocks.import(note, { show_notice: false }));
          }
        }
      }

      // Final batch processing outside the loop
      if (batch.length > 0) {
        this.env.main.notices.show('initial scan progress', [`Making Smart Connections...`, `Progress: ${i} / ${files.length} files`], { timeout: 0 });
        const batchPromise = Promise.all(batch);
        const timeoutPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Final batch processing timed out'));
          }, timeoutDuration);
        });

        try {
          await Promise.race([batchPromise, timeoutPromise]);
        } catch (error) {
          console.error('Final batch processing error:', error);
        }
      }

      this.env.main.notices.remove('initial scan progress');
      this.env.main.notices.show('done initial scan', [`Making Smart Connections...`, `Done importing Smart Notes.`], { timeout: 3000 });
      this.ensure_embeddings();
    }catch(e){
      console.log("error importing blocks");
      console.log(e);
    }
  }
  async ensure_embeddings(show_notice = false) {
    await super.ensure_embeddings(show_notice);
    await this.prune(true);
    if(this.env.smart_blocks?.smart_embed){
      await this.env.smart_blocks.ensure_embeddings({show_notice}); // trigger block-level import
      await this.env.smart_blocks.prune(true);
    }
  }
  async prune(override = false) {
    const start = Date.now();
    const remove = [];
    const items_w_vec = Object.entries(this.items).filter(([key, note]) => note.vec);
    const total_items_w_vec = items_w_vec.length;
    const available_notes = this.env.files.reduce((acc, file) => {
      acc[file.path] = true;
      return acc;
    }, {});
    if(!total_items_w_vec){
      this.clear(); // clear if no items with vec (rebuilds in import)
      return; // skip rest if no items with vec
    }
    for(const [key, note] of items_w_vec){
      if(!available_notes[note.data.path]){
        remove.push(key); // remove if not available
        continue;
      }
      if(note.is_gone){
        remove.push(key); // remove if expired
        continue;
      }
      if(note.meta_changed){
        const content = await note.get_content();
        const hash = await create_hash(content);
        if(hash !== note.last_history?.hash){
          remove.push(key); // remove if changed
          continue;
        }
      }
    }
    console.log(remove);
    const remove_ratio = remove.length / total_items_w_vec;
    console.log(`Pruning: Found ${remove.length} Smart Notes in ${Date.now() - start}ms`);
    if((override && (remove_ratio < 0.5)) || confirm(`Are you sure you want to delete ${remove.length} (${Math.floor(remove_ratio*100)}%) Note-level Embeddings?`)){
      this.delete_many(remove);
      this.adapter._save_queue();
    }
  }
  get current_note() { return this.get(this.env.main.app.workspace.getActiveFile().path); }
  get blocks() { this.env.smart_blocks.get_many(this.last_history.blocks); }
}
class SmartNote extends SmartEntity {
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
    if(hash !== this.last_history?.hash){
      this.data.history.push({ blocks: {}, mtime: this.t_file.stat.mtime, size: this.t_file.stat.size, hash }); // add history entry
      this.data.embedding = {}; // clear embedding (DEPRECATED)
      this.data.embeddings = {}; // clear embeddings
    }else{
      this.last_history.mtime = this.t_file.stat.mtime; // update mtime
      this.last_history.size = this.t_file.stat.size; // update size
    }
    this.env.smart_blocks.import(this, { show_notice: false });
    this.queue_save();
  }
  async get_content() { return await this.env.cached_read(this.t_file); }
  async get_embed_input() {
    if(typeof this._embed_input === 'string' && this._embed_input.length) return this._embed_input; // return cached (temporary) input
    const content = await this.get_content(); // get content from file
    const breadcrumbs = this.data.path.split("/").join(" > ").replace(".md", "");
    const max_tokens = this.collection.smart_embed.max_tokens; // prevent loading too much content
    // console.log("max_tokens: ", max_tokens);
    this._embed_input = `${breadcrumbs}:\n${content}`.substring(0, max_tokens * 10);
    return this._embed_input;
  }
  find_connections() {
    let results = [];
    if(!this.vec && !this.median_block_vec){
      // console.log(this);
      const start_embedding_btn = {
        text: "Start embedding",
        callback: () => {
          this.collection.import().then(() => this.env.main.view.render_nearest(this));
        }
      };
      this.env.main.notices.show('no embedding found', `No embeddings found for ${this.name}.`, { confirm: start_embedding_btn });
      return results;
    }
    const smart_view_filter = this.env.plugin.settings.smart_view_filter;
    const filter = {};
    if(smart_view_filter?.include_exclude){
      filter.exclude_key_starts_with_any = [this.key];
      if(smart_view_filter?.exclude_filter) filter.exclude_key_starts_with_any.push(smart_view_filter.exclude_filter);
      if(smart_view_filter?.include_filter) filter.key_starts_with = smart_view_filter.include_filter;
    } else {
      filter.exclude_key_starts_with = this.key;
    }
    if(this.vec && this.median_block_vec && this.env.smart_blocks.smart_embed && this.collection.smart_embed){
      console.log("FIND v1")
      const nearest_notes = this.env.smart_notes.nearest(this.vec, filter);
      const nearest_blocks = this.env.smart_blocks.nearest(this.median_block_vec, filter);
      results = nearest_blocks.concat(nearest_notes)
        // sort by item.score descending
        .sort((a, b) => {
          if(a.score === b.score) return 0;
          return (a.score > b.score) ? -1 : 1;
        })
      ;
    }else if(this.median_block_vec && this.env.smart_blocks.smart_embed){ // IS THIS EVER CALLED?
      console.log("FIND v2")
      const nearest_blocks = this.env.smart_blocks.nearest(this.median_block_vec, filter);
      // re-rank: sort by block note median block vec sim
      results = nearest_blocks
        .map(block => {
          if(!block.note?.median_block_vec.length){
            block.score = block.sim;
            return block;
          }
          block.score = (block.sim + cos_sim(this.median_block_vec, block.note.median_block_vec)) / 2;
          return block;
        })
      ;
      const nearest_notes = this.env.smart_notes.nearest(this.vec, filter);
      results = results.concat(nearest_notes)
        // sort by item.score descending
        .sort((a, b) => {
          if(a.score === b.score) return 0;
          return (a.score > b.score) ? -1 : 1;
        })
      ;
    }else if(this.vec && this.collection.smart_embed){
      console.log("FIND v3")
      const nearest_notes = this.env.smart_notes.nearest(this.vec, filter);
      results = nearest_notes
        // sort by item.score descending
        .sort((a, b) => {
          if(a.score === b.score) return 0;
          return (a.score > b.score) ? -1 : 1;
        })
      ;
    }
    return results;
  }
  open() { this.env.main.open_note(this.data.path); }
  get_block_by_line(line) { return this.blocks.find(block => block.data.lines[0] <= line && block.data.lines[1] >= line); }
  get block_vecs() { return this.blocks.map(block => block.vec).filter(vec => vec); } // filter out blocks without vec
  get blocks() { return Object.keys(this.last_history.blocks).map(block_key => this.env.smart_blocks.get(block_key)).filter(block => block); } // filter out blocks that don't exist
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }
  get meta_changed() {
    if(!this.last_history) return true;
    if((this.last_history?.mtime || 0) < this.t_file.stat.mtime){
      const size_diff = Math.abs(this.last_history.size - this.t_file.stat.size);
      console.log("mtime changed: ", this.last_history, this.t_file);
      const size_diff_ratio = size_diff / this.last_history.size;
      console.log("size diff ratio: ", size_diff_ratio);
      if(size_diff_ratio > 0.03) return true; // if size diff greater than 5% of last_history.size, assume file changed
    }
    // return (this.last_history.mtime !== this.t_file.stat.mtime) && (this.last_history.size !== this.t_file.stat.size);
    return false;
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
}
class SmartBlocks extends SmartEntities {
  async import(note) {
    try{
      const { blocks } = await this.env.smart_chunks.parse(note);
      blocks.forEach(block => {
        const item = this.create_or_update(block);
        note.last_history.blocks[item.key] = true;
      });
      // const full_block = this.create_or_update({ path: note_path, text: note_content });
      // note.last_history.blocks[full_block.key] = true;
    }catch(e){
      console.log("error parsing blocks for note: ", note.key);
      console.log(e);
    }
  }
  async prune(override = false) {
    const start = Date.now();
    const remove = [];
    const total_items_w_vec = this.embedded_items.length;
    // console.log("total_items_w_vec: ", total_items_w_vec);
    if(!total_items_w_vec){
      // DOES NOT clear like in notes
      return; // skip rest if no items with vec
    }
    for(const [key, block] of Object.entries(this.items)) {
      if(block.is_gone) remove.push(key); // remove if expired
    }
    const remove_ratio = remove.length / total_items_w_vec;
    console.log(`Pruning: Found ${remove.length} SmartBlocks in ${Date.now() - start}ms`);
    if((override && (remove_ratio < 0.5)) || confirm(`Are you sure you want to delete ${remove.length} (${Math.floor(remove_ratio*100)}%) Block-level embeddings?`)){
      this.delete_many(remove);
      this.adapter._save_queue();
    }
  }
}
class SmartBlock extends SmartEntity {
  static get defaults() {
    return {
      data: {
        text: null,
        // hash: null,
        length: 0,
      },
      _embed_input: '', // stored temporarily
    };
  }
  // SmartChunk: text, length, path
  update_data(data) {
    if(!this.is_new || (this.vec?.length !== this.collection.smart_embed?.dims)){
      // length returned by SmartMarkdown
      if(this.data.length !== data.length) this.data.embedding = {}; // clear embedding (DEPRECATED)
      if(this.data.length !== data.length) this.data.embeddings = {}; // clear embeddings
    }
    // if(!this.data.embedding?.vec) this._embed_input += data.text; // store text for embedding (DEPRECATED)
    if(!this.vec) this._embed_input += data.text; // store text for embedding

    delete data.text; // clear data.text to prevent saving text
    super.update_data(data);
    return true;
  }
  init() {
    if(!this.note) return console.log({"no note for block": this.data});
    if(Array.isArray(this.note.last_history.blocks)) this.note.last_history.blocks = {}; // convert to object
    this.note.last_history.blocks[this.key] = true; // add block key to note history entry
  }
  async get_content() {
    // const note_content = await this.note?.get_content();
    // if(!note_content) return null;
    // const block_content = this.env.smart_markdown.get_block_from_path(this.data.path, note_content);
    if(!this.note) return null;
    try{
      const block_content = await this.env.smart_chunks.get_block_from_path(this.data.path, this.note);
      return block_content;
    }catch(e){
      console.log("error getting block content for ", this.data.path, ": ", e);
      return "BLOCK NOT FOUND";
    }
  }
  async get_embed_input() {
    if(typeof this._embed_input === 'string' && this._embed_input.length) return this._embed_input; // return cached (temporary) input
    this._embed_input = this.breadcrumbs + "\n" + (await this.get_content());
    return this._embed_input;
  }
  async get_next_k_shot(i) {
    if(!this.next_block) return null;
    const current = await this.get_content();
    const next = await this.next_block.get_content();
    return `---BEGIN CURRENT ${i}---\n${current}\n---END CURRENT ${i}---\n---BEGIN NEXT ${i}---\n${next}\n---END NEXT ${i}---\n`;
  }
  find_connections() {
    if(!this.vec) return [];
    return this.env.smart_blocks.nearest(this.vec, { exclude_key_starts_with: this.note.key });
  }
  get breadcrumbs() { return this.data.path.split("/").join(" > ").split("#").join(" > ").replace(".md", ""); }
  get embed_input() { return this._embed_input ? this._embed_input : this.get_embed_input(); }
  get lines() { return { start: this.data.lines[0], end: this.data.lines[1] } };
  get folder() { return this.data.path.split("/").slice(0, -1).join("/"); }
  get is_block() { return this.data.path.includes("#"); }
  get is_gone() {
    if(!this.note?.t_file) return true; // gone if missing entity or file
    if(!this.note.last_history.blocks[this.key]) return true;
    return false;
  }
  // use text length to detect changes
  get name() { return (!this.env.main.settings.show_full_path ? this.data.path.split("/").pop() : this.data.path.split("/").join(" > ")).split("#").join(" > ").replace(".md", ""); }
  // uses data.lines to get next block
  get next_block() {
    if(!this.data.lines) return null;
    const next_line = this.data.lines[1] + 1;
    return this.note.blocks?.find(block => next_line === block.data?.lines?.[0]); 
  }
  get note() { return this.env.smart_notes.get(this.note_key); }
  get note_key() { return this.data.path.split("#")[0]; }
  get note_name() { return this.note_key.split("/").pop().replace(".md", ""); }
  // backwards compatibility (DEPRECATED)
  get link() { return this.data.path; }
  get line_start() { return this.data.lines[0]; }
  get line_end() { return this.data.lines[1]; }
}

async function create_hash(text) {
  // if text length greater than 100000, truncate
  if(text.length > 100000) text = text.substring(0, 100000);
  const msgUint8 = new TextEncoder().encode(text.trim()); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

exports.SmartBlock = SmartBlock;
exports.SmartBlocks = SmartBlocks;
exports.SmartNote = SmartNote;
exports.SmartNotes = SmartNotes;