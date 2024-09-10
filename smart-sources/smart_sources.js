import { create_hash } from "./utils/create_hash.js";
import { SmartEntities } from "smart-entities";
import { SourceAdapter } from "./adapters/_adapter.js";
import { MarkdownSourceAdapter } from "./adapters/markdown.js";
// DO: Extract to separate files
export class SmartSources extends SmartEntities {
  constructor(env, opts = {}) {
    super(env, opts);
    this.source_adapters = {
      "md": MarkdownSourceAdapter,
      "txt": MarkdownSourceAdapter, // temp
      "canvas": MarkdownSourceAdapter, // temp
      "default": SourceAdapter,
      ...(env.opts.source_adapters || {}),
      ...(opts.source_adapters || {}),
    };
    this.search_results_ct = 0;
  }
  get notices() { return this.env.smart_connections_plugin?.notices || this.env.main?.notices; }
  async init() {
    await super.init();
    this.notices?.show('initial scan', "Starting initial scan...", { timeout: 0 });
    // init smart_fs
    await this.fs.init();
    // init smart_sources
    Object.values(this.fs.files)
      .filter(file => this.source_adapters[file.extension]) // skip files without source adapter
      .forEach((file) => {
        this.items[file.path] = new this.item_type(this.env, { path: file.path });
      })
    ;
    if(this.env.smart_directories) {
      this.fs.folder_paths.forEach(async (_path) => {
        await this.env.smart_directories.create_or_update({ path: _path });
      });
    }
    this.notices?.remove('initial scan');
    this.notices?.show('done initial scan', "Initial scan complete", { timeout: 3000 });
  }

  get data_fs() { return this.env.smart_env_settings.fs; }
  // removes old data files
  async prune() {
    await this.fs.refresh(); // refresh source files in case they have changed
    const remove_sources = Object.values(this.items)
      .filter(item => item.is_gone || item.excluded)
    ;
    console.log("remove_sources", remove_sources);
    for(let i = 0; i < remove_sources.length; i++){
      const source = remove_sources[i];
      await this.fs.remove(source.data_path);
      delete this.items[source.key];
    }
    const data_files = await this.data_fs.list_files_recursive(this.adapter.data_folder);
    const ajson_file_path_map = Object.values(this.items).reduce((acc, item) => {
      acc[item.data_path] = item.key;
      return acc;
    }, {});
    // get data_files where ajson_file_paths don't exist
    const remove_data_files = data_files.filter(file => !ajson_file_path_map[file.path]);
    for(let i = 0; i < remove_data_files.length; i++){
      await this.data_fs.remove(remove_data_files[i].path);
    }
    const remove_smart_blocks = Object.values(this.env.smart_blocks.items).filter(item => item.is_gone);
    console.log("remove_smart_blocks", remove_smart_blocks);
    for(let i = 0; i < remove_smart_blocks.length; i++){
      delete this.env.smart_blocks.items[remove_smart_blocks[i].key];
    }
    // queue_embed for meta_changed
    const items_w_vec = Object.values(this.items).filter(item => item.vec);
    for (const item of items_w_vec) {
      if (item.meta_changed) item.queue_import();
      else if (item.is_unembedded) item.queue_embed();
    }
  }
  get current_note() { return this.get(this.env.smart_connections_plugin.app.workspace.getActiveFile().path); }
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
    if(this.env.smart_blocks.smart_embed) Object.values(this.env.smart_blocks.items).filter(item => !item.vec).forEach(item => item.queue_embed());
    await this.env.smart_blocks.process_embed_queue();
    await this.process_embed_queue();
  }
  // CRUD
  async create(key, content) {
    await this.env.fs.write(key, content);
    await this.env.fs.refresh();
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
    console.log("importing file", file);
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
    if(this.collection_name === 'smart_sources'){ // excludes sub-classes
      Object.values(this.env.smart_blocks.items).forEach(item => item.init()); // sets _queue_embed if no vec
    }
    await this.process_import_queue();
  }

  async process_import_queue(){
    const import_queue = Object.values(this.items).filter(item => item._queue_import);
    if(import_queue.length){
      console.log(`Smart Connections: Processing import queue: ${import_queue.length} items`);
      const time_start = Date.now();
      // import 100 at a time
      for (let i = 0; i < import_queue.length; i += 100) {
        this.notices?.show('import progress', [`Importing...`, `Progress: ${i} / ${import_queue.length} files`], { timeout: 0 });
        await Promise.all(import_queue.slice(i, i + 100).map(item => item.import()));
      }
      this.notices?.remove('import progress');
      this.notices?.show('done import', [`Importing...`, `Completed import.`], { timeout: 3000 });
      console.log(`Smart Connections: Processed import queue in ${Date.now() - time_start}ms`);
    }else console.log("Smart Connections: No items in import queue");
    this.env.links = this.build_links_map();
    await this.env.smart_blocks.process_embed_queue(); // may need to be first
    await this.process_embed_queue();
    await this.process_save_queue();
  }

  get settings_config(){
    return {
      ...super.settings_config,
      ...settings_config,
    };
  }

}

export const settings_config = {
  "import_sources": {
    "name": "Import Sources",
    "description": "Import sources from file system.",
    "type": "button",
    "callback": "import_sources",
  },
  "refresh_sources": {
    "name": "Refresh Sources",
    "description": "Prunes old data and re-imports all sources and blocks.",
    "type": "button",
    "callback": "refresh_sources",
  }
};