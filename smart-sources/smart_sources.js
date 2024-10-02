import { SmartEntities } from "smart-entities";
export class SmartSources extends SmartEntities {
  constructor(env, opts = {}) {
    super(env, opts);
    this.search_results_ct = 0;
    this._excluded_headings = null;
  }

  async init() {
    await super.init();
    this.notices?.show('initial scan', "Starting initial scan...", { timeout: 0 });
    await this.init_items();
    this.notices?.remove('initial scan');
    this.notices?.show('done initial scan', "Initial scan complete", { timeout: 3000 });
  }

  async init_items() {
    // init smart_fs
    await this.fs.init();
    // init smart_sources
    Object.values(this.fs.files)
      .filter(file => this.source_adapters[file.extension]) // skip files without source adapter
      .forEach(file => this.init_file_path(file.path))
    ;
    this.notices?.remove('initial scan');
    this.notices?.show('done initial scan', "Initial scan complete", { timeout: 3000 });
  }
  init_file_path(file_path){
    this.items[file_path] = new this.item_type(this.env, { path: file_path });
  }

  // removes old data files
  async prune() {
    await this.fs.refresh(); // refresh source files in case they have changed
    this.notices?.show('pruning sources', "Pruning sources...", { timeout: 0 });
    const remove_sources = Object.values(this.items)
      .filter(item => item.is_gone || item.excluded || !item.should_embed)
    ;
    for(let i = 0; i < remove_sources.length; i++){
      const source = remove_sources[i];
      await this.data_fs.remove(source.data_path);
      delete this.items[source.key];
    }
    this.notices?.remove('pruning sources');
    this.notices?.show('pruned sources', `Pruned ${remove_sources.length} sources`, { timeout: 5000 });
    // TEMP: remove last_history from smart_sources
    Object.values(this.items).forEach(item => {
      if(item.data?.history) item.data.history = null;
    });
    this.notices?.show('pruning blocks', "Pruning blocks...", { timeout: 0 });
    // remove smart_blocks
    const remove_smart_blocks = Object.values(this.block_collection.items)
      .filter(item => item.vec && (item.is_gone || !item.should_embed || !item.data?.hash))
    ;
    for(let i = 0; i < remove_smart_blocks.length; i++){
      const item = remove_smart_blocks[i];
      if(item.is_gone) item.delete();
      else item.remove_embeddings();
    }
    this.notices?.remove('pruning blocks');
    this.notices?.show('pruned blocks', `Pruned ${remove_smart_blocks.length} blocks`, { timeout: 5000 });
    // queue_embed for meta_changed
    const items_w_vec = Object.values(this.items).filter(item => item.vec);
    for (const item of items_w_vec) {
      if (item.meta_changed) item.queue_import();
      else if (item.is_unembedded) item.queue_embed();
    }
  }
  build_links_map() {
    const links_map = {};
    for (const source of Object.values(this.items)) {
      for (const link of source.outlink_paths) {
        if (!links_map[link]) links_map[link] = {};
        links_map[link][source.key] = true;
      }
    }
    return links_map;
  }
  async refresh(){
    await this.prune();
    await this.process_import_queue();
    await this.env.smart_blocks.process_embed_queue();
    await this.process_embed_queue();
  }
  // CRUD
  async create(key, content) {
    await this.fs.write(key, content);
    await this.fs.refresh();
    const source = await this.create_or_update({ path: key });
    await source.import();
    return source;
  }
  // SEARCH
  /**
   * Lexical search for matching SmartSource content.
   * @param {Object} search_filter - The filter criteria for the search.
   * @returns {Promise<Array<Entity>>} A promise that resolves to an array of matching entities.
   */
  async search(search_filter = {}) {
    const {
      keywords,
      limit,
      ...filter_opts
    } = search_filter;
    if(!keywords){
      console.warn("search_filter.keywords not set");
      return [];
    }
    console.log("search_filter", search_filter);
    this.search_results_ct = 0;
    const initial_results = this.filter(filter_opts);
    const search_results = [];
    for (let i = 0; i < initial_results.length; i += 10) {
      const batch = initial_results.slice(i, i + 10);
      const batch_results = await Promise.all(
        batch.map(async (item) => {
          try {
            const matches = await item.search(search_filter);
            if (matches) {
              this.search_results_ct++;
              return { item, score: matches };
            } else return null;
          } catch (error) {
            console.error(`Error searching item ${item.id || 'unknown'}:`, error);
            return null;
          }
        })
      );
      search_results.push(...batch_results.filter(Boolean));
    }
    console.log("search_results_ct", this.search_results_ct);
    return search_results
      .sort((a, b) => b.score - a.score) // sort by relevance 
      .map(result => result.item)
    ;
  }

  async import_file(file){
    // add file to fs
    this.fs.files[file.path] = file;
    this.fs.file_paths.push(file.path);
    // create source
    const source = await this.create_or_update({ path: file.path });
    // import
    await source.import();
    // process embed queue
    await this.env.smart_blocks.process_embed_queue();
    await this.process_embed_queue();
    // process save queue
    await this.process_save_queue();
  }

  async process_load_queue(){
    await super.process_load_queue();
    if(this.collection_key === 'smart_sources'){ // excludes sub-classes
      Object.values(this.env.smart_blocks.items).forEach(item => item.init()); // sets _queue_embed if no vec
    }
    this.block_collection.loaded = Object.keys(this.block_collection.items).length;
    if(!this.opts.prevent_import_on_load){
      await this.process_import_queue();
    }
  }

  async process_import_queue(){
    const import_queue = Object.values(this.items).filter(item => item._queue_import);
    console.log("import_queue " + import_queue.length);
    if(import_queue.length){
      const time_start = Date.now();
      // import 100 at a time
      for (let i = 0; i < import_queue.length; i += 100) {
        this.notices?.show('import progress', [`Importing...`, `Progress: ${i} / ${import_queue.length} files`], { timeout: 0 });
        await Promise.all(import_queue.slice(i, i + 100).map(item => item.import()));
      }
      this.notices?.remove('import progress');
      this.notices?.show('done import', [`Processed import queue in ${Date.now() - time_start}ms`], { timeout: 3000 });
    }else this.notices?.show('no import queue', ["No items in import queue"]);
    const start_time = Date.now();
    this.env.links = this.build_links_map();
    const end_time = Date.now();
    console.log(`Time spent building links: ${end_time - start_time}ms`);
    await this.process_embed_queue();
    await this.process_save_queue();
  }
  get source_adapters() { return this.env.opts.collections?.[this.collection_key]?.source_adapters || {}; }
  get notices() { return this.env.smart_connections_plugin?.notices || this.env.main?.notices; }
  get current_note() { return this.get(this.env.smart_connections_plugin.app.workspace.getActiveFile().path); }
  get fs() {
    if(!this._fs){
      this._fs = new this.env.opts.modules.smart_fs.class(this.env, {
        adapter: this.env.opts.modules.smart_fs.adapter,
        fs_path: this.env.opts.env_path || '',
        exclude_patterns: this.excluded_patterns || [],
      });
    }
    return this._fs;
  }

  get settings_config(){
    return {
      ...super.settings_config,
      ...this.process_settings_config(settings_config),
      ...Object.values(this.source_adapters).reduce((acc, adapter) => {
        if(adapter.settings_config){
          acc = { ...acc, ...adapter.settings_config };
        }
        return acc;
      }, {}),
      // ... existing settings ...
    };
  }

  get block_collection() { return this.env.smart_blocks; }
  /**
   * @deprecated use block_collection instead
   */
  get blocks(){ return this.env.smart_blocks; }
  get embed_queue() {
    try{
      const embed_blocks = this.block_collection.settings.embed_blocks;
      return Object.values(this.items).reduce((acc, item) => {
        if(item._queue_embed) acc.push(item);
        if(embed_blocks) item.blocks.forEach(block => {
          if(block._queue_embed && block.should_embed) acc.push(block);
        });
        return acc;
      }, []);
    }catch(e){
      console.error(`Error getting embed queue: ` + JSON.stringify((e || {}), null, 2));
    }
  }

  get smart_change() {
    if(!this.opts.smart_change) return; // disabled at config level
    if(typeof this.settings?.smart_change?.active !== 'undefined' && !this.settings.smart_change.active) return console.warn('smart_change disabled by settings');
    if(!this._smart_change){
      this._smart_change = new this.opts.smart_change.class(this.opts.smart_change);
    }
    return this._smart_change;
  }

  async run_load(){
    await super.run_load();
    this.blocks.render_settings();
  }

  async run_import(){
    const start_time = Date.now();
    await this.process_import_queue();
    const end_time = Date.now();
    console.log(`Time spent importing: ${end_time - start_time}ms`);
    this.render_settings();
    this.blocks.render_settings();
  }

  async run_refresh(){
    await this.prune();
    await this.process_save_queue();
    await this.unload();
    await this.init();
    await this.process_load_queue();
    await this.render_settings();
    await this.process_import_queue();
    Object.values(this.block_collection.items).forEach(item => !item.vec ? item.queue_embed() : null);
    await this.process_embed_queue();
    this.render_settings();
    this.blocks.render_settings();
  }

  async run_force_refresh(){
    console.log("run_force_refresh");
    this.clear();
    this.block_collection.clear();
    console.log("cleared");
    console.log("items " + Object.keys(this.items).length);
    console.log("blocks " + Object.keys(this.block_collection.items).length);
    // re-init fs
    this._fs = null;
    await this.fs.init();
    await this.init_items();
    this._excluded_headings = null;
    console.log("init_items " + Object.keys(this.items).length);
    Object.values(this.items).forEach(item => {
      item.queue_import();
      item.queue_embed();
      item.loaded_at = Date.now() + 9999999999; // prevent re-loading during import
    });
    await this.process_import_queue();
  }

  get excluded_patterns() {
    return [
      ...(this.file_exclusions?.map(file => `${file}**`) || []),
      ...(this.folder_exclusions || []).map(folder => `${folder}**`),
      this.env.env_data_dir + "/**",
    ];
  }

  get file_exclusions() {
    return (this.env.settings?.file_exclusions?.length) ? this.env.settings.file_exclusions.split(",").map((file) => file.trim()) : [];
  }

  get folder_exclusions() {
    return (this.env.settings?.folder_exclusions?.length) ? this.env.settings.folder_exclusions.split(",").map((folder) => {
      folder = folder.trim();
      if (folder.slice(-1) !== "/") return folder + "/";
      return folder;
    }) : [];
  }

  get excluded_headings() {
    if (!this._excluded_headings){
      this._excluded_headings = (this.env.settings?.excluded_headings?.length) ? this.env.settings.excluded_headings.split(",").map((heading) => heading.trim()) : [];
    }
    return this._excluded_headings;
  }

  get included_files() {
    return this.fs.file_paths
      .filter(file => file.endsWith(".md") || file.endsWith(".canvas"))
      .filter(file => !this.fs.is_excluded(file))
      .length;
  }

  get total_files() {
    return this.env.fs.file_paths
      .filter(file => file.endsWith(".md") || file.endsWith(".canvas"))
      .length;
  }

}

export const settings_config = {
  "smart_change.active": {
    "name": "Smart Change (change safety)",
    "description": "Enable Smart Changes (prevents accidental deletions/overwrites).",
    "type": "toggle",
    "default": true,
  },
};