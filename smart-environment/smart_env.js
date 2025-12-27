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

import { SmartEvents } from 'smart-events';
import { render as settings_template } from './components/settings.js';
import { SmartSettings } from 'smart-settings/smart_settings.js';
import { deep_merge } from 'smart-utils/deep_merge.js';
import { camel_case_to_snake_case } from 'smart-utils/camel_case_to_snake_case.js';
import { normalize_opts } from './utils/normalize_opts.js';
import { deep_clone_config } from './utils/deep_clone_config.js';
import { merge_env_config } from './utils/merge_env_config.js';
import { deep_merge_no_overwrite } from './utils/deep_merge_no_overwrite.js';
import { migrate_exclusion_settings_2025_08_22 } from './migrations/exclusion_settings.js';
import { compare_versions } from './utils/compare_versions.js';

const ROOT_SCOPE = typeof globalThis !== 'undefined' ? globalThis : Function('return this')();

/**
 * @class SmartEnv
 * @description
 * The SmartEnv class represents a global runtime environment managing configuration,
 * references to collections, modules, and a global scope. It ensures that only one instance
 * of the environment is created and acts as a central coordination point.
 */
export class SmartEnv {
  static version = '2.2.5';
  scope_name = 'smart_env';
  static global_ref = ROOT_SCOPE;
  global_ref = this.constructor.global_ref;

  constructor(opts = {}) {
    this.state = 'init';
    this._components = {};
    this.collections = {};
    this.load_timeout = null;
    this._collections_version_signature = null; // ← new
    this._events = SmartEvents.create(this, build_events_opts(this.config?.modules?.smart_events));
    if (opts.primary_main_key) this.primary_main_key = opts.primary_main_key;
  }
  /**
   * Builds or returns the cached configuration object.
   * The cache is invalidated automatically whenever the “version signature”
   * of any collection class changes (controlled by its static `version`).
   *
   * @returns {Object} the merged, up-to-date environment config
   */
  get config() {
    const signature = this.compute_collections_version_signature();

    if (this._config && signature === this._collections_version_signature) {
      return this._config;                       // still current – use cache
    }

    // cache miss or collections updated → rebuild
    this._collections_version_signature = signature;
    this._config = {};

    const sorted_configs = Object.entries(this.smart_env_configs)
      .sort(([main_key]) => {
        if (!this.primary_main_key) return 0;
        return main_key === this.primary_main_key ? -1 : 0;
      });

      
    for (const [key, rec] of sorted_configs) {
      if (!rec?.main) {
        console.warn(`SmartEnv: '${key}' unloaded, skipping`);
        delete this.smart_env_configs[key];
        continue;
      }
      if (!rec?.opts){
        console.warn(`SmartEnv: '${key}' opts missing, skipping`);
        continue;          // extra safety
      }
      merge_env_config(
        this._config,
        deep_clone_config(normalize_opts(rec.opts)),
      );
    }
    return this._config;
  }

  /**
   * Produces a deterministic string representing the current versions of every
   * collection class across all mains.  When any collection ships a higher
   * `static version`, the signature changes – automatically invalidating the
   * cached `config`.
   *
   * @returns {string} pipe-delimited version signature
   */
  compute_collections_version_signature() {
    const list = [];

    for (const rec of Object.values(this.smart_env_configs)) {
      const { opts } = rec || {};
      if (!opts) continue;
      for (const [collection_key, def] of Object.entries(opts.collections || {})) {
        const cls = def?.class;
        const v = typeof cls?.version === 'number' ? cls.version : 0;
        list.push(`${collection_key}:${v}`);
      }
    }
    return list.sort().join('|');
  }

  // ========================================================================
  // ──  GLOBAL HELPERS / STATIC API                                         ──
  // ========================================================================

  get env_start_wait_time() {
    if(typeof this.config.env_start_wait_time === 'number') return this.config.env_start_wait_time;
    return 5000;
  }
  static get global_env() {
    return this.global_ref.smart_env;
  }
  static set global_env(env) {
    this.global_ref.smart_env = env;
  }
  static get mains() {
    return Object.keys(this.global_ref.smart_env_configs || {});
  }
  get mains() {
    return Object.keys(this.global_ref.smart_env_configs || {});
  }
  static get should_reload() {
    if(!this.global_env) return true;
    if(this.global_env.state === 'loaded') return true;
    if(typeof this.global_env?.constructor?.version === 'undefined') return true;
    // If our new code is a higher version, reload:
    if(compare_versions(this.version, this.global_env.constructor?.version) > 0){
      console.warn(
        "SmartEnv: Reloading environment because of version mismatch",
        `${this.version} > ${this.global_env.constructor.version}`
      );
      return true;
    }
    return false;
  }
  static get smart_env_configs() {
    if(!this.global_ref.smart_env_configs) this.global_ref.smart_env_configs = {};
    return this.global_ref.smart_env_configs;
  }
  get smart_env_configs() {
    if(!this.global_ref.smart_env_configs) this.global_ref.smart_env_configs = {};
    return this.global_ref.smart_env_configs;
  }

  /**
   * Serializes all collection data in the environment into a plain object.
   * @returns {object}
   */
  to_json() {
    return Object.fromEntries(
      Object.entries(this).filter(([, val]) => typeof val?.collection_key !== 'undefined')
        .map(([key, collection]) => [key, collection_to_plain(collection)]),
    );
  }

  /**
   * Waits for either a specific main to be registered in the environment,
   * or (if `opts.main` is not specified) waits for environment collections to load.
   * @param {object} opts
   * @param {object} [opts.main] - if set, the function waits until that main is found.
   * @returns {Promise<SmartEnv>} Resolves with the environment instance
   */
  static wait_for(opts = {}) {
    return new Promise((resolve) => {
      if (opts.main) {
        const interval = setInterval(() => {
          if (this.global_env && this.global_env[opts.main]) {
            clearInterval(interval);
            resolve(this.global_env);
          }
        }, 1000);
      } else {
        const interval = setInterval(() => {
          if (this.global_env && this.global_env.state === 'loaded') {
            clearInterval(interval);
            resolve(this.global_env);
          }
        }, 100);
      }
    });
  }
  /**
   * Creates or updates a SmartEnv instance.
   * - If a global environment exists and is an older version or lacks 'init_main', it is replaced.
   * @param {Object} main - The main object to be added to the SmartEnv instance.
   * @param {Object} [env_config] - Options for configuring the SmartEnv instance.
   * @returns {SmartEnv} The SmartEnv instance.
   * @throws {TypeError} If an invalid main object is provided.
   * @throws {Error} If there's an error creating or updating the SmartEnv instance.
   */
  static async create(main, env_config) {
    if (!main || typeof main !== 'object') {
      throw new TypeError('SmartEnv: Invalid main object provided');
    }
    if(!env_config) throw new Error("SmartEnv.create: 'env_config' parameter is required.");
    env_config.version = this.version;

    this.add_main(main, env_config);

    if(this.should_reload){
      const opts = {};
      // if(this.global_env && this.version > (this.global_env.constructor?.version || 0)){
      if(this.global_env && compare_versions(this.version, this.global_env.constructor?.version || 0) > 0){
        opts.primary_main_key = camel_case_to_snake_case(main.constructor.name);
      }
      if(this.global_env?.load_timeout) clearTimeout(this.global_env.load_timeout);

      this.global_env = new this(opts);

      const g = this.global_ref;
      if(!g.all_envs) g.all_envs = [];
      g.all_envs.push(this.global_env);
    }

    clearTimeout(this.global_env.load_timeout);
    this.global_env.load_timeout = setTimeout(async () => {
      await this.global_env.load();
      this.global_env.load_timeout = null;
    }, this.global_env.env_start_wait_time);

    return this.global_env;
  }
  static add_main(main, env_config = null) {
    if (this.global_env) {
      this.global_env._config = null;                    // invalidate cache
      this.global_env._collections_version_signature = null;
    }

    // if (!env_config) env_config = main.smart_env_config;
    const main_key = camel_case_to_snake_case(main.constructor.name);
    this.smart_env_configs[main_key] = { main, opts: env_config };
    this.create_env_getter(main);
  }
  /**
   * Creates a dynamic environment getter on any instance object.
   * The returned 'env' property will yield the global `smart_env`.
   * @param {Object} instance_to_receive_getter
   */
  static create_env_getter(instance_to_receive_getter) {
    Object.defineProperty(instance_to_receive_getter, 'env', {
      configurable: true,
      get: () => this.global_env,
    });
  }
  create_env_getter(instance_to_receive_getter) {
    this.constructor.create_env_getter(instance_to_receive_getter);
  }
  async load() {
    this.state = 'loading';
    await this.fs.load_files(); // skip exclusions; detect env_data_dir
    if(!this.settings) await SmartSettings.create(this);
    if(this.config.default_settings){
      // takes precedence over default_settings in collection classes (merged by subsequent init_collections)
      deep_merge_no_overwrite(this.settings, this.config.default_settings);
    }
    migrate_exclusion_settings_2025_08_22(this.settings);
    this.smart_settings.save();
    await this.init_collections();
    for(const [main_key, {main, opts}] of Object.entries(this.smart_env_configs)){
      this[main_key] = main;
    }
    await this.ready_to_load_collections();
    await this.load_collections();
    this.state = 'loaded';
  }
  /**
   * Initializes collection classes if they have an 'init' function.
   * @param {Object} [config=this.config]
  */
  async init_collections(config = this.config) {
    for (const key of Object.keys(config.collections || {})) {
      const _class = config.collections[key]?.class;
      if (!_class) continue;
      if (_class.default_settings) {
        deep_merge_no_overwrite(
          this.settings,
          {
            [key]: _class.default_settings
          }
        );
      }
      if (typeof _class.init !== 'function') continue; // skip if not a class or no init
      await _class.init(this, { ...config.collections[key] });
      this.collections[key] = 'init';
    }
  }
  /**
   * Hook/Override this method to wait for any conditions before loading collections. 
   * @param {Object} main
   */
  async ready_to_load_collections() {
    // OVVERRIDE IF NEEDED TO WAIT BEFORE LOADING COLLECTIONS
  }
  /**
   * Loads any available collections, processing their load queues.
   * @param {Object} [collections=this.collections] - Key-value map of collection instances.
   */
  async load_collections(collections = this.collections) {
    const collection_keys = Object.keys(collections || {})
      // sort by this.config.collections[key].load_order || 0 (ascending)
      .sort((a, b) => {
        const order_a = this.config.collections?.[a]?.load_order || 0;
        const order_b = this.config.collections?.[b]?.load_order || 0;
        return order_a - order_b;
      })
    ;
    for (const key of collection_keys) {
      const time_start = Date.now();
      if (typeof this[key]?.process_load_queue === 'function') {
        await this[key].process_load_queue();
        this[key].load_time_ms = Date.now() - time_start; 
        this.collections[key] = 'loaded';
        console.log(`Loaded ${this[key].collection_key} in ${this[key].load_time_ms}ms`);
      }
    }
  }
  /**
   * Removes a main from the global.smart_env_configs to exclude it on reload
   * @param {Class} main
   * @param {Object|null} [unload_config=null]
   */
  static unload_main(main) {
    const main_key = camel_case_to_snake_case(main.constructor.name);
    this.smart_env_configs[main_key] = null;
    delete this.smart_env_configs[main_key];
  }
  unload_main(main) {
    this.constructor.unload_main(main);
  }

  /**
   * Triggers a save event in all known collections.
   */
  save() {
    for (const key of Object.keys(this.collections)) {
      this[key].process_save_queue?.();
    }
  }

  /**
   * Initialize a module from the configured `this.opts.modules`.
   * @param {string} module_key
   * @param {object} opts
   * @returns {object|null} instance of the requested module or null if not found
   */
  init_module(module_key, opts = {}) {
    const module_config = this.opts.modules[module_key];
    if (!module_config) {
      return console.warn(`SmartEnv: module ${module_key} not found`);
    }
    opts = {
      ...{ ...module_config, class: null },
      ...opts
    };
    return new module_config.class(opts);
  }
  get notices() {
    if(!this._notices) {
      const SmartNoticesClass = this.config.modules.smart_notices.class;
      this._notices = new SmartNoticesClass(this, {
        adapter: this.config.modules.smart_notices.adapter,
      });
    }
    return this._notices;
  }

  /**
   * Exposes a settings template function from environment opts or defaults.
   * @returns {Function}
   */
  get settings_template() {
    return this.opts.components?.smart_env?.settings || settings_template;
  }

  /**
   * Renders settings UI into a container, using the environment's `settings_template`.
   * @param {HTMLElement} [container=this.settings_container]
   */
  async render_settings(container = this.settings_container) {
    if (!this.settings_container || container !== this.settings_container) {
      this.settings_container = container;
    }
    if (!container) {
      throw new Error('Container is required');
    }
    const frag = await this.render_component('settings', this, {});
    this.smart_view.empty(container);
    container.appendChild(frag);
    return frag;
  }

  /**
   * Renders a named component using an optional scope and options.
   * @deprecated use env.smart_components.render instead (2025-10-11)
   * @param {string} component_key
   * @param {Object} scope
   * @param {Object} [opts]
   * @returns {Promise<HTMLElement>}
   */
  async render_component(component_key, scope, opts = {}) {
    const component_renderer = this.get_component(component_key, scope);
    if(!component_renderer) {
      console.warn(`SmartEnv: component ${component_key} not found for scope ${scope.constructor.name}`);
      return this.smart_view.create_doc_fragment(`<div class="smart-env-component-not-found">
        <h1>Component Not Found</h1>
        <p>The component ${component_key} was not found for scope ${scope.constructor.name}.</p>
      </div>`);
    }
    const frag = await component_renderer(scope, opts);
    return frag;
  }

  /**
   * Retrieves or creates a memoized component renderer function.
   * @deprecated use env.smart_components instead (2025-10-11)
   * @param {string} component_key
   * @param {Object} scope
   * @returns {Function|undefined}
   */
  get_component(component_key, scope) {
    const scope_name = scope.collection_key ?? scope.scope_name;
    const _cache_key = scope_name ? `${scope_name}-${component_key}` : component_key;
    if (!this._components[_cache_key]) {
      try {
        if (this.opts.components[scope_name]?.[component_key]) {
          const component_config = this.opts.components[scope_name][component_key];
          const component = component_config.render || component_config;
          this._components[_cache_key] = component.bind(
            this.init_module('smart_view')
          );
        } else if (this.opts.components[component_key]) {
          const component_config = this.opts.components[component_key];
          const component = component_config.render || component_config;
          this._components[_cache_key] = component.bind(
            this.init_module('smart_view')
          );
        } else {
          console.warn(
            `SmartEnv: component ${component_key} not found for scope ${scope_name}`
          );
        }
      } catch (e) {
        console.error('Error getting component', e);
        console.log(
          `scope_name: ${scope_name}; component_key: ${component_key}; this.opts.components: ${Object.keys(
            this.opts.components || {}
          ).join(', ')}; this.opts.components[scope_name]: ${Object.keys(
            this.opts.components[scope_name] || {}
          ).join(', ')}`
        );
      }
    }
    return this._components[_cache_key];
  }


  /**
   * A built-in settings schema for this environment.
   * @abstract
   * @returns {Object}
   */
  get settings_config() {
    return {};
  }

  get global_prop() {
    return this.opts.global_prop ?? 'smart_env';
  }

  get item_types() {
    return this.opts.item_types;
  }


  get fs_module_config() {
    return this.opts.modules.smart_fs;
  }

  get fs() {
    if (!this.smart_fs) {
      this.smart_fs = new this.fs_module_config.class(this, {
        adapter: this.fs_module_config.adapter,
        fs_path: this.opts.env_path || ''
      });
    }
    return this.smart_fs;
  }

  get env_data_dir() {
    const env_settings_files =
      this.fs.file_paths?.filter((path) => path.endsWith('smart_env.json')) || [];
    let env_data_dir = '.smart-env';
    if (env_settings_files.length > 0) {
      if (env_settings_files.length > 1) {
        // pick one with most files in it
        const env_data_dir_counts = env_settings_files.map((path) => {
          const dir = path.split('/').slice(-2, -1)[0];
          return {
            dir,
            count: this.fs.file_paths.filter((p) => p.includes(dir)).length
          };
        });
        env_data_dir = env_data_dir_counts.reduce(
          (max, dirObj) => (dirObj.count > max.count ? dirObj : max),
          env_data_dir_counts[0]
        ).dir;
      } else {
        env_data_dir = env_settings_files[0].split('/').slice(-2, -1)[0];
      }
    }
    return env_data_dir;
  }

  get data_fs() {
    if (!this._fs) {
      this._fs = new this.fs_module_config.class(this, {
        adapter: this.fs_module_config.adapter,
        fs_path: this.data_fs_path
      });
    }
    return this._fs;
  }

  get data_fs_path() {
    if(!this._data_fs_path) {
      this._data_fs_path = (this.opts.env_path
        + (this.opts.env_path ? (this.opts.env_path.includes('\\') ? '\\' : '/') : '')
        + this.env_data_dir).replace(/\\\\/g, '\\').replace(/\/\//g, '/')
      ;
    }
    return this._data_fs_path;
  }

  /**
   * Saves the current settings to the file system.
   * @param {Object|null} [settings=null] - Optional settings to override the current settings before saving.
   * @returns {Promise<void>}
   */
  async save_settings(settings) {
    this._saved = false;
    if (!(await this.data_fs.exists(''))) {
      await this.data_fs.mkdir('');
    }
    await this.data_fs.write('smart_env.json', JSON.stringify(settings, null, 2));
    this._saved = true;
  }

  /**
   * Loads settings from the file system, merging with any `default_settings`
   * @returns {Promise<Object>} the loaded settings
   */
  async load_settings() {
    if (!(await this.data_fs.exists('smart_env.json'))) await this.save_settings({});
    // must deep copy default_settings to avoid mutating the original object (prevents unexpected behavior)
    let settings = JSON.parse(JSON.stringify(this.config.default_settings || {})); // set defaults if provided
    deep_merge(settings, JSON.parse(await this.data_fs.read('smart_env.json'))); // load saved settings
    this._saved = true;
    if(this.fs.auto_excluded_files) {
      const existing_file_exclusions = settings.smart_sources.file_exclusions.split(',').map(s => s.trim()).filter(Boolean);
      settings.smart_sources.file_exclusions = [...existing_file_exclusions, ...this.fs.auto_excluded_files]
        .filter((value, index, self) => self.indexOf(value) === index)
        .join(',')
      ;
    }
    return settings;
  }

  /**
   * Refreshes file-system state if exclusions changed,
   * then re-renders relevant settings UI
   */
  async update_exclusions() {
    this.smart_sources._fs = null;
    // await this.smart_sources.fs.init();
    await this.smart_sources.init_fs();
  }

  // DEPRECATED

  /**
   * Lazily instantiate the module 'smart_view'.
   * @deprecated use env.smart_components instead (2025-09-30)
   * @returns {object}
   */
  get smart_view() {
    if (!this._smart_view) {
      this._smart_view = this.init_module('smart_view');
    }
    return this._smart_view;
  }

  /** @deprecated access `this.state` and `collection.state` directly instead */
  get collections_loaded(){
    return this.state === 'loaded';
  }
  /** @deprecated Use this['main_class_name'] instead of this.main/this.plugin */
  get main() {
    return this.smart_env_configs[this.mains[0]]?.main;
  }
  /**
   * @deprecated use component pattern instead
   */
  get ejs() {
    return this.opts.ejs;
  }
  /**
   * @deprecated use component pattern instead
   */
  get templates() {
    return this.opts.templates;
  }
  /**
   * @deprecated use component pattern instead
   */
  get views() {
    return this.opts.views;
  }
  /**
   * @deprecated use this.config instead
   */
  get opts() {
    return this.config;
  }
  /**
   * @deprecated Use this.main_class_name instead of this.plugin
   */
  get plugin() {
    return this.main;
  }
}

function collection_to_plain(collection) {
  return {
    items: Object.fromEntries(
      Object.entries(collection.items || {}).map(([key, item]) => [key, item.data]),
    ),
  };
}

function build_events_opts(module_config) {
  if (!module_config) return {};
  if (typeof module_config === 'function') {
    return { adapter_class: module_config };
  }
  const adapter_class = module_config.adapter_class || module_config.adapter;
  return adapter_class ? { adapter_class } : {};
}
