import { deep_merge } from 'smart-utils/deep_merge.js';
import { create_actions_proxy } from './utils/create_actions_proxy.js';

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

/**
 * @class Collection
 *
 * The `Collection` class represents a group of `CollectionItem` instances. It provides:
 * - CRUD operations (create, update, delete) for items
 * - Filtering and listing items
 * - Loading and saving items via a data adapter
 * - Rendering collection-level settings
 *
 * **Key Features:**
 * - Maintains items in a flat key-to-instance structure for performance
 * - Batch and queue processing for load/save operations
 * - Data-driven configuration from environment
 * - Supports filtering by various item key patterns
 * - Supports rendering settings and using components pattern for UI
 */
export class Collection {
  static version = 0.001;
  /**
   * Constructs a new Collection instance.
   *
   * @param {Object} env - The environment context containing configurations and adapters.
   * @param {Object} [opts={}] - Optional configuration.
   * @param {string} [opts.collection_key] - Custom key to override default collection name.
   * @param {string} [opts.data_dir] - Custom data directory path.
   */
  constructor(env, opts = {}) {
    // this.env = env;
    env.create_env_getter(this);
    this.opts = opts;
    if (opts.collection_key) this.collection_key = opts.collection_key;
    this.env[this.collection_key] = this;
    this.config = this.env.config;
    this.items = {};
    this.loaded = null;
    this._loading = false;
    this.load_time_ms = null;
    this.settings_container = null;
  }

  /**
   * Initializes a new collection in the environment. Override in subclass if needed.
   *
   * @param {Object} env
   * @param {Object} [opts={}]
   * @returns {Promise<void>}
   */
  static async init(env, opts = {}) {
    env[this.collection_key] = new this(env, opts);
    await env[this.collection_key].init();
    env.collections[this.collection_key] = 'init';
  }

  /**
   * The unique collection key derived from the class name.
   * @returns {string}
   */
  static get collection_key() {
    let name = this.name;
    // if ends with number, remove it
    if (name.match(/\d$/)) name = name.slice(0, -1);
    return name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  }

  /**
   * Instance-level init. Override in subclasses if necessary.
   * @returns {Promise<void>}
   */
  async init() {}

  /**
   * Creates or updates an item in the collection.
   * - If `data` includes a key that matches an existing item, that item is updated.
   * - Otherwise, a new item is created.
   * After updating or creating, the item is validated. If validation fails, the item is logged and returned without being saved.
   * If validation succeeds for a new item, it is added to the collection and marked for saving.
   *
   * If the item’s `init()` method is async, a promise is returned that resolves once init completes.
   * 
   * NOTE: wrapping in try/catch seems to fail to catch errors thrown in async init functions when awaiting create_or_update
   *
   * @param {Object} [data={}] - Data for creating/updating an item.
   * @returns {Promise<Item>|Item} The created or updated item. May return a promise if `init()` is async.
   */

  create_or_update(data = {}) {
    // Attempt to find an existing item based on the provided data
    const existing_item = this.find_by(data);

    // If no existing item, create a new one
    const item = existing_item ? existing_item : new this.item_type(this.env);

    // If a new item is being created, we need to save it by default
    item._queue_save = !existing_item;

    // Update the item's data and note if it changed
    const data_changed = item.update_data(data);

    // If this is a new item, validate it before adding to the collection
    if (!existing_item && !item.validate_save()) {
      // console.warn("Invalid item, skipping adding to collection:", item);
      return item;
    }

    // If new item is valid, add it to the collection
    if (!existing_item) {
      this.set(item);
    }

    // If existing item data didn't change, no need to re-save or re-init
    if (existing_item && !data_changed) return existing_item;

    // If initialization is asynchronous, return a promise that resolves after init
    if (item.init instanceof AsyncFunction) {
      return new Promise((resolve) => {
        item.init(data).then(() => resolve(item));
      });
    }

    // For synchronous init, just run init and return the item
    item.init(data);
    return item;
  }

  /**
   * Finds an item by partial data match (first checks key). If `data.key` provided,
   * returns the item with that key; otherwise attempts a match by merging data.
   *
   * @param {Object} data - Data to match against.
   * @returns {Item|null}
   */
  find_by(data) {
    if (data.key) return this.get(data.key);
    const temp = new this.item_type(this.env);
    const temp_data = JSON.parse(JSON.stringify(data, temp.sanitize_data(data)));
    deep_merge(temp.data, temp_data);
    return temp.key ? this.get(temp.key) : null;
  }

  /**
   * Filters items based on provided filter options or a custom function.
   *
   * @param {Object|Function} [filter_opts={}] - Filter options or a predicate function.
   * @returns {Item[]} Array of filtered items.
   */
  filter(filter_opts = {}) {
    if (typeof filter_opts === 'function') {
      return Object.values(this.items).filter(filter_opts);
    }

    const results = [];
    const { first_n } = filter_opts;

    for (const item of Object.values(this.items)) {
      if (first_n && results.length >= first_n) break;
      if (item.filter(filter_opts)) results.push(item);
    }
    return results;
  }

  /**
   * Alias for `filter()`
   * @param {Object|Function} filter_opts
   * @returns {Item[]}
   */
  list(filter_opts) { return this.filter(filter_opts); }

  /**
   * Retrieves an item by key.
   * @param {string} key
   * @returns {Item|undefined}
   */
  get(key) { return this.items[key]; }

  /**
   * Retrieves multiple items by an array of keys.
   * @param {string[]} keys
   * @returns {Item[]}
   */
  get_many(keys = []) {
    if (!Array.isArray(keys)) {
      console.error("get_many called with non-array keys:", keys);
      return [];
    }
    return keys.map((key) => this.get(key)).filter(Boolean);
  }

  /**
   * Retrieves a random item from the collection, optionally filtered by options.
   * @param {Object} [opts]
   * @returns {Item|undefined}
   */
  get_rand(opts = null) {
    if (opts) {
      const filtered = this.filter(opts);
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
    const keys = this.keys;
    return this.items[keys[Math.floor(Math.random() * keys.length)]];
  }

  /**
   * Adds or updates an item in the collection.
   * @param {Item} item
   */
  set(item) {
    if (!item.key) throw new Error("Item must have a key property");
    this.items[item.key] = item;
  }

  /**
   * Updates multiple items by their keys.
   * @param {string[]} keys
   * @param {Object} data
   */
  update_many(keys = [], data = {}) {
    this.get_many(keys).forEach((item) => item.update_data(data));
  }

  /**
   * Clears all items from the collection.
   */
  clear() {
    this.items = {};
  }

  /**
   * @returns {string} The collection key, can be overridden by opts.collection_key
   */
  get collection_key() {
    return this._collection_key ? this._collection_key : this.constructor.collection_key;
  }
  set collection_key(key) { this._collection_key = key; }


  /**
   * Lazily initializes and returns the data adapter instance for this collection.
   * @returns {Object} The data adapter instance.
   */
  get data_adapter() {
    if (!this._data_adapter) {
      const AdapterClass = this.get_adapter_class('data');
      this._data_adapter = new AdapterClass(this);
    }
    return this._data_adapter;
  }
  get_adapter_class(type) {
    const config = this.env.opts.collections?.[this.collection_key];
    const adapter_key = type + '_adapter';
    const adapter_module = config?.[adapter_key]
      ?? this.env.opts.collections?.smart_collections?.[adapter_key]
    ;
    if(typeof adapter_module === 'function') return adapter_module; // backward compatibility
    if(typeof adapter_module?.collection === 'function') return adapter_module.collection;
    throw new Error(`No '${type}' adapter class found for ${this.collection_key} or smart_collections`);
  }

  /**
   * Data directory strategy for this collection. Defaults to 'multi'.
   * @deprecated should be handled in adapters (2025-12-09)
   * @returns {string}
   */
  get data_dir() { return this.collection_key; }

  /**
   * File system adapter from the environment.
   * @returns {Object}
   */
  get data_fs() { return this.env.data_fs; }

  /**
   * Derives the corresponding item class name based on this collection's class name.
   * @returns {string}
   */
  get item_class_name() {
    let name = this.constructor.name;
    // if ends with number, remove it
    if (name.match(/\d$/)) name = name.slice(0, -1);
    if (name.endsWith('ies')) return name.slice(0, -3) + 'y'; 
    else if (name.endsWith('s')) return name.slice(0, -1);
    return name + "Item";
  }

  /**
   * Derives a readable item name from the item class name.
   * @returns {string}
   */
  get item_name() {
    return this.item_class_name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  }

  /**
   * Retrieves the item type (constructor) from the environment.
   * @deprecated replace with item_class with strict adherence to conventions (2025-10-28)
   * @returns {Function} Item constructor.
   */
  get item_type() {
    if(!this._item_type) this._item_type = this.resolve_item_type();
    return this._item_type;
  }
  // TEMP resolver (2025-11-03): until better handled on merging configs at obsidian-smart-env startup
  resolve_item_type() {
    const available = [
      this.env.config?.items?.[this.item_name],
      this.opts.item_type,
      this.env.item_types?.[this.item_class_name],
    ].filter(Boolean).sort((a,b) => {
      // highest version first
      const a_version = a?.class?.version || a.version || 0;
      const b_version = b?.class?.version || b.version || 0;
      return b_version - a_version;
    });
    if(available.length === 0) {
      throw new Error(`No item_type found for collection '${this.collection_key}' with item_name '${this.item_name}' or class_name '${this.item_class_name}'`);
    }
    return available[0].class || available[0];
    // if(this.env.config?.items?.[this.item_name]?.class) return this.env.config.items[this.item_name].class;
    // if(this.opts.item_type) return this.opts.item_type; // DEPRECATED: somewhat improved handling (future: config.items)
    // return this.env.item_types[this.item_class_name]; // DEPRECATED item_types config
  }

  /**
   * Returns an array of all keys in the collection.
   * @returns {string[]}
   */
  get keys() { return Object.keys(this.items); }

  /**
   * @deprecated use data_adapter instead (2024-09-14)
   */
  get adapter() { return this.data_adapter; }


  /**
   * @method process_save_queue
   * @description 
   * Saves items flagged for saving (_queue_save) back to AJSON or SQLite. This ensures persistent storage 
   * of any updates made since last load/import. This method also writes changes to disk (AJSON files or DB).
   */
  async process_save_queue(opts = {}) {
    if(opts.force) {
      Object.values(this.items).forEach((item) => item._queue_save = true);
    }
    // Just delegate to the adapter
    await this.data_adapter.process_save_queue(opts);
  }
  /**
   * @alias process_save_queue
   * @returns {Promise<void>}
   */
  async save(opts = {}) { await this.process_save_queue(opts); }

  /**
   * @method process_load_queue
   * @description 
   * Loads items that have been flagged for loading (_queue_load). This may involve 
   * reading from AJSON/SQLite or re-importing from markdown if needed. 
   * Called once initial environment is ready and collections are known.
   */
  async process_load_queue() {
    // Just delegate to the adapter
    await this.data_adapter.process_load_queue();
  }

  /**
   * Retrieves processed settings configuration.
   * @returns {Object}
   */
  get settings_config() { return this.process_settings_config({}); }

  /**
   * Processes given settings config, adding prefixes and handling conditionals.
   * @deprecated removing settings_config from collections (2025-11-24)
   *
   * @private
   * @param {Object} _settings_config
   * @param {string} [prefix='']
   * @returns {Object}
   */
  process_settings_config(_settings_config, prefix = '') {
    const add_prefix = (key) =>
      prefix && !key.includes(`${prefix}.`) ? `${prefix}.${key}` : key;

    return Object.entries(_settings_config).reduce((acc, [key, val]) => {
      let new_val = { ...val };

      if (new_val.conditional) {
        if (!new_val.conditional(this)) return acc;
        delete new_val.conditional;
      }

      if (new_val.callback) new_val.callback = add_prefix(new_val.callback);
      if (new_val.btn_callback) new_val.btn_callback = add_prefix(new_val.btn_callback);
      if (new_val.options_callback) new_val.options_callback = add_prefix(new_val.options_callback);

      const new_key = add_prefix(this.process_setting_key(key));
      acc[new_key] = new_val;
      return acc;
    }, {});
  }

  /**
   * Processes an individual setting key. Override if needed.
   * @param {string} key
   * @returns {string}
   */
  process_setting_key(key) { return key; }

  /**
   * Default settings for this collection. Override in subclasses as needed.
   * @returns {Object}
   */
  get default_settings() { return {}; }

  /**
   * Current settings for the collection.
   * Initializes with default settings if none exist.
   * @returns {Object}
   */
  get settings() {
    if (!this.env.settings[this.collection_key]) {
      this.env.settings[this.collection_key] = this.default_settings;
    }
    return this.env.settings[this.collection_key];
  }


  /**
   * Unloads collection data from memory.
   */
  unload() {
    this.clear();
    this.unloaded = true;
    this.env.collections[this.collection_key] = null;
  }

  /**
   * Displays a process notice if the operation exceeds one second.
   *
   * @param {string} process - Identifier for the ongoing process.
   * @param {Object} [opts={}] - Additional options passed to the notice.
   */
  show_process_notice(process, opts = {}) {
    if(!this.debounce_process_notice) this.debounce_process_notice = {};
    this.debounce_process_notice[process] = setTimeout(() => {
      this.debounce_process_notice[process] = null;
      this.env.notices?.show(process, { collection_key: this.collection_key, ...opts });
    }, 1000);
  }

  /**
   * Clears any pending process notice timers and removes active notices.
   *
   * @param {string} process - Identifier for the process notice to clear.
   */
  clear_process_notice(process) {
    if (this.debounce_process_notice?.[process]) {
      clearTimeout(this.debounce_process_notice[process]);
      this.debounce_process_notice[process] = null;
    } else {
      this.env.notices?.remove(process);
    }
  }

  /**
   * Emits an event with collection metadata.
   *
   * @param {string} event_key
   * @param {Object} [payload={}]
   * @returns {void}
   */
  emit_event(event_key, payload = {}) {
    this.env.events?.emit(event_key, { collection_key: this.collection_key, ...payload });
  }
  on_event(event_key, callback) {
    return this.env.events?.on(event_key, (payload) => {
      if (payload?.collection_key && payload.collection_key !== this.collection_key) return;
      callback(payload);
    });
  }

  /**
   * Lazily binds action functions to the collection instance.
   *
   * @returns {Object} Bound action functions keyed by name.
   */
  get actions() {
    if (!this.constructor.key) this.constructor.key = this.collection_key;
    if (!this._actions) {
      // TODO: clarified scope of action modules that should be included
      const actions_modules = {
        ...(this.env?.config?.actions || {}),
        ...(this.env?.config?.collections?.[this.collection_key]?.actions || {}),
        ...(this.env?.opts?.collections?.[this.collection_key]?.actions || {}),
        ...(this.opts?.actions || {}),
      };
      this._actions = create_actions_proxy(this, actions_modules);
    }
    return this._actions;
  }

  /**
   * Clears cached actions proxy and rebuilds on next access.
   * @returns {Object} Rebuilt proxy with latest source snapshot.
   */
  refresh_actions() {
    this._actions = null;
    return this.actions;
  }

  // debounce running process save queue
  queue_save() {
    if(this._debounce_queue_save) clearTimeout(this._debounce_queue_save);
    this._debounce_queue_save = setTimeout(() => {
      this.process_save_queue();
    }, 750);
  }

  // BEGIN DEPRECATED
  /**
   * @deprecated use env.smart_components~~env.smart_view~~ instead
   * @returns {Object} smart_view instance
   */
  get smart_view() {
    if(!this._smart_view) this._smart_view = this.env.init_module('smart_view');
    return this._smart_view;
  }
  /**
   * Renders the settings for the collection into a given container.
   * @deprecated use env.render_component('collection_settings', this) instead (2025-05-25: decouple UI from collections)
   * @param {HTMLElement} [container=this.settings_container]
   * @param {Object} opts
   * @returns {Promise<HTMLElement>}
   */
  async render_settings(container = this.settings_container, opts = {}) {
    return await this.render_collection_settings(container, opts);
  }

  /**
   * Helper function to render collection settings.
   * @deprecated use env.render_component('collection_settings', this) instead (2025-05-25: decouple UI from collections)
   * @param {HTMLElement} [container=this.settings_container]
   * @param {Object} opts
   * @returns {Promise<HTMLElement>}
   */
  async render_collection_settings(container = this.settings_container, opts = {}) {
    if (container && (!this.settings_container || this.settings_container !== container)) {
      this.settings_container = container;
    } else if (!container) {
      // NOTE: Creating a fragment if no container provided. This depends on `env.smart_view`.
      container = this.env.smart_view.create_doc_fragment('<div></div>');
    }
    this.env.smart_view.safe_inner_html(container, `<div class="sc-loading">Loading ${this.collection_key} settings...</div>`);
    const frag = await this.env.render_component('settings', this, opts);
    this.env.smart_view.empty(container);
    container.appendChild(frag);
    return container;
  }
}

