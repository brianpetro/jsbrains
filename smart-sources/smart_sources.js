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
  }
  async init() {
    await super.init();
    // init smart blocks
    this.env.smart_blocks = new this.env.collections.smart_blocks(this.env, {
      custom_collection_name: 'smart_blocks'
    });
    await this.env.smart_blocks.init();
    // init smart_fs
    await this.fs.init();
    // init smart_sources
    this.env.main.notices?.show('initial scan', "Starting initial scan...", { timeout: 0 });
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
    this.env.main.notices?.remove('initial scan');
    this.env.main.notices?.show('done initial scan', "Initial scan complete", { timeout: 3000 });
    await this.process_load_queue(); // loads both smart_sources and smart_blocks
    await this.process_import_queue(); // imports both smart_sources and smart_blocks (includes embedding)
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
      acc[this.data_fs.fs_path + "/" + item.data_path] = item.key;
      return acc;
    }, {});
    // get data_files where ajson_file_paths don't exist
    console.log("ajson_file_path_map", ajson_file_path_map);
    const remove_data_files = data_files.filter(file => !ajson_file_path_map[file.path]);
    console.log("remove_data_files", remove_data_files);
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
      Object.entries(item.data.embeddings).forEach(([model, embedding]) => {
        // only keep active model embeddings
        if(model !== item.embed_model){
          item.data.embeddings[model] = null;
          item.queue_save();
        }
      });
      if (item.meta_changed) item.queue_import();
      else if (item.is_unembedded) item.queue_embed();
    }
  }
  get current_note() { return this.get(this.env.main.app.workspace.getActiveFile().path); }
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
  async refresh_embeddings() {
    await this.prune();
    await this.process_import_queue();
    await this.env.smart_blocks.process_embed_queue();
    await this.process_embed_queue();
  }
  // CRUD
  async create(key, content) {
    await this.env.fs.write(key, content);
    const source = await this.create_or_update({ path: key });
    return source;
  }
  // SEARCH
  /**
   * Lexical search for matching SmartSource content.
   * @param {Object} search_filter - The filter criteria for the search.
   * @returns {Promise<Array<Entity>>} A promise that resolves to an array of matching entities.
   */
  async search(search_filter = {}) {
    if(!search_filter.keywords){
      console.warn("search_filter.keywords not set");
      return [];
    }
    const search_results = await Promise.all(
      this.filter(search_filter).map(async (item) => {
        try {
          const matches = await item.search(search_filter);
          return matches ? { item, score: matches } : null;
        } catch (error) {
          console.error(`Error searching item ${item.id || 'unknown'}:`, error);
          return null;
        }
      })
    );
    return search_results
      .filter(Boolean)
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

  async process_import_queue(){
    const import_queue = Object.values(this.items).filter(item => item._queue_import);
    if(!import_queue.length) return console.log("Smart Connections: No items in import queue");
    console.log(`Smart Connections: Processing import queue: ${import_queue.length} items`);
    const time_start = Date.now();
    // import 100 at a time
    for (let i = 0; i < import_queue.length; i += 100) {
      this.env.main.notices?.show('import progress', [`Importing...`, `Progress: ${i} / ${import_queue.length} files`], { timeout: 0 });
      await Promise.all(import_queue.slice(i, i + 100).map(item => item.import()));
    }
    this.env.main.notices?.remove('import progress');
    this.env.main.notices?.show('done import', [`Importing...`, `Completed import.`], { timeout: 3000 });
    console.log(`Smart Connections: Processed import queue in ${Date.now() - time_start}ms`);
    this.env.links = this.build_links_map();
    await this.env.smart_blocks.process_embed_queue(); // may need to be first
    await this.process_embed_queue();
    await this.process_save_queue();
  }

}
