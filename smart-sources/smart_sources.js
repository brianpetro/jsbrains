import { SmartEntities } from "smart-entities";
import { sort_by_score } from "smart-entities/utils/sort_by_score.js";
/**
 * @class SmartSources
 * @extends SmartEntities
 * @classdesc Manages a collection of SmartSource entities, handling initialization, pruning, importing, and searching of sources.
 */
export class SmartSources extends SmartEntities {
  /**
   * Creates an instance of SmartSources.
   * @constructor
   * @param {Object} env - The environment instance.
   * @param {Object} [opts={}] - Configuration options.
   */
  constructor(env, opts = {}) {
    super(env, opts);
    /** @type {number} Counter for search results */
    this.search_results_ct = 0;
    /** @type {Array<string>|null} Cached excluded headings */
    this._excluded_headings = null;
  }

  /**
   * Initializes the SmartSources instance by performing an initial scan of sources.
   * @async
   * @returns {Promise<void>}
   */
  async init() {
    await super.init();
    await this.init_items();
  }

  /**
   * Initializes items by letting each adapter do any necessary file-based scanning.
   * Adapters that do not rely on file scanning can skip or do nothing.
   * @async
   * @returns {Promise<void>}
   */
  async init_items() {
    this.show_process_notice('initial_scan');
    for (const AdapterClass of Object.values(this.source_adapters)) {
      if (typeof AdapterClass.init_items === 'function') {
        // Sub-classes can store a timestamp in 'collection.fs_items_initialized' or similarly to skip if done
        await AdapterClass.init_items(this);
      }
    }
    this.clear_process_notice('initial_scan');
    this.notices?.show('done_initial_scan', { collection_key: this.collection_key });
  }

  /**
   * Creates (or returns existing) a SmartSource for a given file path, if the extension is recognized.
   * @param {string} file_path - The path to the file or pseudo-file
   * @returns {SmartSource|undefined} The newly created or existing SmartSource, or undefined if no recognized extension
   */
  init_file_path(file_path) {
    // Extract extension using a new helper:
    const ext = this.get_extension_for_path(file_path);
    if (!ext) {
      // skip if extension not recognized
      // console.warn(`No recognized extension for ${file_path}`);
      return;
    }
    // If item already exists, return it
    if (this.items[file_path]) return this.items[file_path];

    // create new item
    const item = new this.item_type(this.env, { path: file_path });
    this.items[file_path] = item;
    item.queue_import();
    item.queue_load();
    return item;
  }

  /**
   * Looks for an extension in descending order:
   * e.g. split "my.file.name.github" -> ["my","file","name","github"]
   * Try 'file.name.github', 'name.github', 'github'
   * Return the first that is in 'source_adapters'
   * @param {string} file_path
   * @returns {string|undefined} recognized extension, or undefined if none
   */
  get_extension_for_path(file_path) {
    if (!file_path) return undefined;
    const pcs = file_path.split('.');
    // if there's no dot, or only one piece, we have no extension
    if (pcs.length < 2) return undefined;
    // shift off the first portion so we only look at possible extension combos
    pcs.shift(); // remove the first piece (like a base name)
    while (pcs.length) {
      const test_ext = pcs.join('.').toLowerCase();
      if (this.source_adapters[test_ext]) {
        return test_ext;
      }
      pcs.shift();
    }
    return undefined;
  }

  /**
   * Builds a map of links between sources.
   * @returns {Object} An object mapping link paths to source keys.
   */
  build_links_map() {
    const start_time = Date.now();
    this.links = {};
    for (const source of Object.values(this.items)) {
      for (const link of source.outlinks) {
        if (!this.links[link]) this.links[link] = {};
        this.links[link][source.key] = true;
      }
    }
    const end_time = Date.now();
    console.log(`Time spent building links: ${end_time - start_time}ms`);
    return this.links;
  }

  /**
   * Creates a new source with the given key and content.
   * @async
   * @param {string} key - The key (path) of the new source.
   * @param {string} content - The content to write to the new source.
   * @returns {Promise<SmartSource>} The created SmartSource instance.
   */
  async create(key, content) {
    await this.fs.write(key, content);
    await this.fs.refresh();
    const source = await this.create_or_update({ path: key });
    await source.import();
    return source;
  }

  /**
   * Performs a lexical search for matching SmartSource content.
   * @async
   * @param {Object} search_filter - The filter criteria for the search.
   * @param {string[]} search_filter.keywords - An array of keywords to search for.
   * @param {number} [search_filter.limit] - The maximum number of results to return.
   * @returns {Promise<Array<SmartSource>>} A promise that resolves to an array of matching SmartSource entities.
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
    return search_results
      .sort((a, b) => b.score - a.score) // Sort by relevance 
      .map(result => result.item)
    ;
  }

  /**
   * Looks up entities based on the provided parameters.
   * @async
   * @param {Object} [params={}] - Parameters for the lookup.
   * @param {Object} [params.filter] - Filter options.
   * @param {number} [params.k] - Deprecated. Use `params.filter.limit` instead.
   * @returns {Promise<Array<SmartSource>>} A promise that resolves to an array of matching SmartSource entities.
   */
  async lookup(params={}) {
    const limit = params.filter?.limit
      || params.k // DEPRECATED: for backwards compatibility
      || this.env.settings.lookup_k
      || 10
    ;
    if(params.filter?.limit) delete params.filter.limit; // Remove to prevent limiting in initial filter (limit should happen after nearest for lookup)
    let results = await super.lookup(params);
    if(results.error) {
      console.warn(results.error);
      return [];
    }
    if(this.block_collection?.settings?.embed_blocks) {
      results = [
        ...results,
        ...(await this.block_collection.lookup(params)),
      ].sort(sort_by_score);
    }
    console.log(results);
    return results.slice(0, limit);
  }

  /**
   * Processes the load queue by loading items and optionally importing them.
   * Called after a "re-load" from settings, or after environment init.
   * @async
   * @returns {Promise<void>}
   */
  async process_load_queue(){
    await super.process_load_queue();
    if(this.collection_key === 'smart_sources' && this.env.smart_blocks){ // Excludes sub-classes
      Object.values(this.env.smart_blocks.items).forEach(item => item.init()); // Sets _queue_embed if no vec
    }
    if(this.block_collection){
      this.block_collection.loaded = Object.keys(this.block_collection.items).length;
    }
    if(!this.opts.prevent_import_on_load){
      await this.process_source_import_queue(this.opts); // this.opts passes process_embed_queue if present
    }
    this.build_links_map();
  }

  /**
   * @method process_source_import_queue
   * @description 
   * Imports items (SmartSources or SmartBlocks) that have been flagged for import.
   */
  async process_source_import_queue(opts={}){
    const { process_embed_queue = true, force = false } = opts;
    if (force) Object.values(this.items).forEach(item => item._queue_import = true);
    const import_queue = Object.values(this.items).filter(item => item._queue_import);
    console.log("import_queue " + import_queue.length);
    if(import_queue.length){
      const time_start = Date.now();
      // Import 100 at a time
      for (let i = 0; i < import_queue.length; i += 100) {
        this.notices?.show('import_progress', {
          progress: i,
          total: import_queue.length,
        });
        await Promise.all(import_queue.slice(i, i + 100).map(item => item.import()));
      }
      setTimeout(() => {
        this.notices?.remove('import_progress');
      }, 1000);

      this.notices?.show('done_import', {
        count: import_queue.length,
        time_in_seconds: (Date.now() - time_start) / 1000
      });

    } else {
      this.notices?.show('no_import_queue');
    }

    this.build_links_map();
    if(process_embed_queue) await this.process_embed_queue();
    else console.log("skipping process_embed_queue");
    await this.process_save_queue();
    await this.block_collection?.process_save_queue();
  }

  /**
   * Retrieves the source adapters based on the collection configuration.
   * @readonly
   * @returns {Object} An object mapping file extensions to adapter constructors.
   */
  get source_adapters() {
    if(!this._source_adapters){
      const source_adapters = Object.values(this.env.opts.collections?.[this.collection_key]?.source_adapters || {});
      const _source_adapters = source_adapters.reduce((acc, adapter) => {
        adapter.extensions?.forEach(ext => acc[ext] = adapter);
        return acc;
      }, {});
      if(Object.keys(_source_adapters).length){
        this._source_adapters = _source_adapters;
      }
    }
    return this._source_adapters;
  }

  /**
   * Retrieves the notices system from the environment.
   * @readonly
   * @returns {Object} The notices object.
   */
  get notices() { return this.env.smart_connections_plugin?.notices || this.env.main?.notices; }

  /**
   * Retrieves the currently active note.
   * @readonly
   * @returns {SmartSource|null} The current SmartSource instance or null if none.
   */
  get current_note() { return this.get(this.env.smart_connections_plugin.app.workspace.getActiveFile().path); }

  /**
   * Retrieves the file system instance, initializing it if necessary.
   * @readonly
   * @returns {SmartFS} The file system instance.
   */
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

  /**
   * Retrieves the settings configuration by combining superclass settings and adapter-specific settings.
   * @readonly
   * @returns {Object} The settings configuration object.
   */
  get settings_config(){
    const _settings_config = {
      ...super.settings_config,
      ...this.process_settings_config(settings_config),
      ...this.process_settings_config(this.embed_model.settings_config, 'embed_model'),
      ...Object.entries(this.source_adapters).reduce((acc, [file_extension, adapter_constructor]) => {
        if(acc[adapter_constructor]) return acc; // Skip if already added same adapter_constructor
        const item = this.items[Object.keys(this.items).find(i => i.endsWith(file_extension))];
        const adapter_instance = new adapter_constructor(item || new this.item_type(this.env, {}));
        if(adapter_instance.settings_config){
          acc[adapter_constructor.name] = {
            type: "html",
            value: `<h4>${adapter_constructor.name} adapter</h4>`
          };
          acc = { ...acc, ...adapter_instance.settings_config };
        }
        return acc;
      }, {}),
    };
    return _settings_config;
  }

  /**
   * Retrieves the block collection associated with SmartSources.
   * @readonly
   * @returns {SmartBlocks} The block collection instance.
   */
  get block_collection() { return this.env.smart_blocks; }

  /**
   * Retrieves the embed queue containing items and their blocks to be embedded.
   * @readonly
   * @returns {Array<Object>} The embed queue.
   */
  get embed_queue() {
    if(!this._embed_queue.length){
      try{
        const embed_blocks = this.block_collection.settings.embed_blocks;
        this._embed_queue = Object.values(this.items).reduce((acc, item) => {
          if(item._queue_embed || (item.should_embed && item.is_unembedded)) acc.push(item);
          if(embed_blocks) item.blocks.forEach(block => {
            if(block._queue_embed || (block.should_embed && block.is_unembedded)) acc.push(block);
          });
          return acc;
        }, []);
        // console.log(this._embed_queue.map(item => item.key));
      }catch(e){
        console.error(`Error getting embed queue:`, e);
      }
    }
    return this._embed_queue;
  }

  /**
   * Clears all data by removing sources and blocks, reinitializing the file system, and reimporting items.
   * @async
   * @returns {Promise<void>}
   */
  async run_clear_all(){
    this.notices?.show('clearing_all');
    // Clear all data
    await this.data_fs.remove_dir(this.data_dir, true);
    this.clear();
    this.block_collection.clear();
    this._fs = null;

    // await this.fs.init();
    await this.init_fs();

    await this.init_items();
    this._excluded_headings = null;
    
    Object.values(this.items).forEach(item => {
      item.queue_import();
      item.queue_embed();
      item.loaded_at = Date.now() + 9999999999; // Prevent immediate reload
    });
    
    this.notices?.remove('clearing_all');
    this.notices?.show('done_clearing_all');
    await this.process_source_import_queue();
  }
  async init_fs(opts={}){
    const {force_refresh = false} = opts;
    if(force_refresh) await this.env.fs.refresh();
    await this.fs.load_exclusions();
    // prevent re-scanning all files (already done at env-level fs.init)
    this.fs.file_paths = this.fs.post_process(this.env.fs.file_paths);
    this.fs.files = this.fs.file_paths.reduce((acc, file_path) => {
      acc[file_path] = this.env.fs.files[file_path];
      return acc;
    }, {});
    this.fs.folder_paths = this.fs.post_process(this.env.fs.folder_paths);
    this.fs.folders = this.fs.folder_paths.reduce((acc, folder_path) => {
      acc[folder_path] = this.env.fs.folders[folder_path];
      return acc;
    }, {});
  }

  /**
   * Deletes all *.ajson files in the "multi/" data_dir, then re-saves all sources (opts.force=true).
   */
  async run_clean_up_data() {
    this.notices?.show('pruning_collection', { collection_key: this.block_collection.collection_key });
    // Identify blocks to remove
    const remove_smart_blocks = this.block_collection.filter(item => {
      if(!item.vec) return false; // skip blocks that have no vec?
      if(item.is_gone) {
        item.reason = "is_gone";
        return true;
      }
      if(!item.should_embed) {
        item.reason = "!should_embed";
        return true;
      }
      return false;
    });
    // Remove identified blocks
    for(let i = 0; i < remove_smart_blocks.length; i++){
      const item = remove_smart_blocks[i];
      if(item.is_gone) item.delete();
      else item.remove_embeddings();
    }
    this.notices?.remove('pruning_collection');
    this.notices?.show('done_pruning_collection', { collection_key: this.block_collection.collection_key, count: remove_smart_blocks.length });
    console.log(`Pruned ${remove_smart_blocks.length} blocks:\n${remove_smart_blocks.map(item => `${item.reason} - ${item.key}`).join("\n")}`);
    // 1) remove all .ajson files in `this.data_dir` ("multi" by default)
    await this.data_fs.remove_dir(this.data_dir, true);
    // 2) forcibly re-save all items
    await this.process_save_queue({ force: true });
  }

  /**
   * Retrieves patterns for excluding files/folders from processing.
   * @readonly
   * @returns {Array<string>}
   */
  get excluded_patterns() {
    return [
      ...(this.file_exclusions?.map(file => `${file}**`) || []),
      ...(this.folder_exclusions || []).map(folder => `${folder}**`),
      this.env.env_data_dir + "/**",
    ];
  }

  /**
   * Retrieves the file exclusion patterns from settings.
   * @readonly
   * @returns {Array<string>} An array of file exclusion patterns.
   */
  get file_exclusions() {
    return (this.env.settings?.file_exclusions?.length) ? this.env.settings.file_exclusions.split(",").map((file) => file.trim()) : [];
  }

  /**
   * Retrieves the folder exclusion patterns from settings.
   * @readonly
   * @returns {Array<string>} An array of folder exclusion patterns.
   */
  get folder_exclusions() {
    return (this.env.settings?.folder_exclusions?.length) ? this.env.settings.folder_exclusions.split(",").map((folder) => {
      folder = folder.trim();
      if (folder === "") return false;
      if (folder === "/") return false;
      if (!folder.endsWith("/")) return folder + "/";
      return folder;
    }).filter(Boolean) : [];
  }

  /**
   * Retrieves the excluded headings from settings.
   * @readonly
   * @returns {Array<string>} An array of excluded headings.
   */
  get excluded_headings() {
    if (!this._excluded_headings){
      this._excluded_headings = (this.env.settings?.excluded_headings?.length) ? this.env.settings.excluded_headings.split(",").map((heading) => heading.trim()) : [];
    }
    return this._excluded_headings;
  }

  /**
   * Retrieves the count of included files that are not excluded.
   * @readonly
   * @returns {number} The number of included files.
   */
  get included_files() {
    const extensions = Object.keys(this.source_adapters);
    return this.fs.file_paths
      .filter(file_path => extensions.some(ext => file_path.endsWith(ext)) && !this.fs.is_excluded(file_path))
      .length;
  }
  get excluded_file_paths() {
    return this.env.fs.file_paths // use env-level fs (contains all files)
      .filter(file_path => this.fs.is_excluded(file_path));
  }

  /**
   * Retrieves the total number of files, regardless of exclusion.
   * @readonly
   * @returns {number} The total number of files.
   */
  get total_files() {
    return this.fs.file_paths
      .filter(file => file.endsWith(".md") || file.endsWith(".canvas"))
      .length;
  }

  get data_dir() { return 'multi'; }
}

export const settings_config = {
  // "smart_change.active": {
  //   "name": "Smart Change (change safety)",
  //   "description": "Enable Smart Changes (prevents accidental deletions/overwrites).",
  //   "type": "toggle",
  //   "default": true,
  // },
};