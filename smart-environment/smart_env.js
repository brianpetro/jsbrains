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

import { render as settings_template } from './components/settings.js';
import { SmartSettings } from 'smart-settings/smart_settings.js';
import { deep_merge } from './utils/deep_merge.js';
import { deep_remove_exclusive_props } from './utils/deep_remove_exclusive_props.js';
import { camel_case_to_snake_case } from './utils/camel_case_to_snake_case.js';
import { normalize_opts } from './utils/normalize_opts.js';
import { deep_clone_config } from './utils/deep_clone_config.js';
import { merge_env_config } from './utils/merge_env_config.js';

/**
 * @class SmartEnv
 * @description
 * The SmartEnv class represents a global runtime environment managing configuration,
 * references to collections, modules, and a global scope. It ensures that only one instance
 * of the environment is created and acts as a central point of coordination.
 */
export class SmartEnv {
  /**
   * @type {number} version - Bump this number when shipping a new version of SmartEnv.
   * If a newer version is loaded into a runtime that already has an older environment,
   * an automatic reload of all existing mains will occur.
   */
  static version = 2.11;
  scope_name = 'smart_env';
  static global_ref = (typeof window !== 'undefined' ? window : global);
  global_ref = (typeof window !== 'undefined' ? window : global);
  constructor(opts = {}) {
    this.state = 'init';
    this._components = {};
    this.collections = {};
    this.load_timeout = null;
  }
  /**
   * Returns the config object for the SmartEnv instance.
   * @returns {Object} The config object.
   */
  get config() {
    if(!this._config) {
      this._config = {};
      for(const [main_key, {main, opts}] of Object.entries(this.smart_env_configs)){
        if(!main){
          console.warn(`SmartEnv: '${main_key}' has been unloaded, skipping inclusion in smart_env`);
          delete this.smart_env_configs[main_key];
          continue; // skip if main has been unloaded
        }
        merge_env_config(
          this._config,
          deep_clone_config(
            normalize_opts(opts)
          )
        );
      }
      // TODO: merge custom actions and components from smart-env folder and cache resulting object
    }
    return this._config;
  }
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
    if(this.global_env.constructor.version < this.version){
      console.warn("SmartEnv: Reloading environment because of version mismatch", `${this.version} > ${this.global_env.constructor.version}`);
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
          if (this.global_env && this.global_env.mains.includes(opts.main)) {
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
   * - If a global environment exists and is an older version, it is unloaded and replaced.
   * - If the environment is the same version or newer, it reuses the existing environment.
   * @param {Object} main - The main object to be added to the SmartEnv instance.
   * @param {Object} [main_env_opts={}] - Options for configuring the SmartEnv instance.
   * @returns {SmartEnv} The SmartEnv instance.
   * @throws {TypeError} If an invalid main object is provided.
   * @throws {Error} If there's an error creating or updating the SmartEnv instance.
   */
  static async create(main, main_env_opts = null) {
    if (!main || typeof main !== 'object') {
      throw new TypeError('SmartEnv: Invalid main object provided');
    }
    if(!main_env_opts) {
      if(!main.smart_env_config) {
        throw new Error('SmartEnv: No main_env_opts or main.smart_env_config provided');
      }
      main_env_opts = main.smart_env_config;
    }
    this.add_main(main, main_env_opts);
    if(this.should_reload){
      this.global_env = new this();
      await this.global_env.fs.load_files(); // skip exclusions; detect env_data_dir
      await SmartSettings.create(this.global_env);
    }
    clearTimeout(this.global_env.load_timeout);
    this.global_env.load_timeout = setTimeout(async () => {
      await this.global_env.load();
    }, this.global_env.env_start_wait_time);
    return this.global_env;
  }
  static add_main(main, main_env_opts = null) {
    if(this.global_env?._config) this.global_env._config = null;
    const main_key = camel_case_to_snake_case(main.constructor.name);
    this.smart_env_configs[main_key] = {main, opts: main_env_opts};
    this.create_env_getter(main);
  }
  /**
   * Creates a dynamic environment getter on any instance object.
   * The returned 'env' property will yield the global `smart_env`.
   * @param {Object} instance_to_receive_getter
   */
  static create_env_getter(instance_to_receive_getter) {
    Object.defineProperty(instance_to_receive_getter, 'env', {
      get: function() {
        return (typeof window !== 'undefined' ? window : global).smart_env;
      },
      // configurable: true
    });
  }
  create_env_getter(instance_to_receive_getter) {
    this.constructor.create_env_getter(instance_to_receive_getter);
  }
  async load() {
    await this.init_collections();
    for(const [main_key, {main, opts}] of Object.entries(this.smart_env_configs)){
      this[main_key] = main;
      await this.ready_to_load_collections(main);
    }
    await this.load_collections();
    this.state = 'loaded';
  }
  /**
   * Initializes collection classes if they have an 'init' function.
   * @param {Object} [config=this.opts]
   */
  async init_collections(config = this.config) {
    for (const key of Object.keys(config.collections || {})) {
      const _class = config.collections[key]?.class;
      if (typeof _class?.init !== 'function') continue; // skip if not a class or no init
      await _class.init(this, { ...config.collections[key] });
      this.collections[key] = 'init';
    }
  }
  /**
   * Hook for main classes that optionally implement `ready_to_load_collections()`.
   * @param {Object} main
   */
  async ready_to_load_collections(main) {
    if (typeof main?.ready_to_load_collections === 'function') {
      await main.ready_to_load_collections();
    }
    return true;
  }
  /**
   * Loads any available collections, processing their load queues.
   * @param {Object} [collections=this.collections] - Key-value map of collection instances.
   */
  async load_collections(collections = this.collections) {
    for (const key of Object.keys(collections || {})) {
      if (typeof this[key]?.process_load_queue === 'function') {
        if(this.state === 'init' && this[key].opts.prevent_load_on_init === true) continue;
        await this[key].process_load_queue();
      }
      this.collections[key] = 'loaded';
    }
  }
  /**
   * Removes a main from the window.smart_env_configs to exclude it on reload
   * @param {Class} main_class
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
    container.innerHTML = '';
    container.appendChild(frag);
    return frag;
  }

  /**
   * Renders a named component using an optional scope and options.
   * @param {string} component_key
   * @param {Object} scope
   * @param {Object} [opts]
   * @returns {Promise<HTMLElement>}
   */
  async render_component(component_key, scope, opts = {}) {
    const component_renderer = this.get_component(component_key, scope);
    const frag = await component_renderer(scope, opts);
    return frag;
  }

  /**
   * Retrieves or creates a memoized component renderer function.
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
          this._components[_cache_key] = this.opts.components[scope_name][component_key].bind(
            this.init_module('smart_view')
          );
        } else if (this.opts.components[component_key]) {
          this._components[_cache_key] = this.opts.components[component_key].bind(
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
   * Lazily instantiate the module 'smart_view'.
   * @returns {object}
   */
  get smart_view() {
    if (!this._smart_view) {
      this._smart_view = this.init_module('smart_view');
    }
    return this._smart_view;
  }

  /**
   * A built-in settings schema for this environment.
   * @returns {Object}
   */
  get settings_config() {
    return {
      is_obsidian_vault: {
        name: 'Obsidian Vault',
        description: 'Toggle on if this is an Obsidian vault.',
        type: 'toggle',
        default: false
      },
      file_exclusions: {
        name: 'File Exclusions',
        description: 'Comma-separated list of files to exclude.',
        type: 'text',
        default: '',
        callback: 'update_exclusions'
      },
      folder_exclusions: {
        name: 'Folder Exclusions',
        description: 'Comma-separated list of folders to exclude.',
        type: 'text',
        default: '',
        callback: 'update_exclusions'
      },
      excluded_headings: {
        name: 'Excluded Headings',
        description: 'Comma-separated list of headings to exclude.',
        type: 'text',
        default: ''
      }
    };
  }

  get global_prop() {
    return this.opts.global_prop ?? 'smart_env';
  }
  get global_ref() {
    return (
      this.opts.global_ref ??
      (typeof window !== 'undefined' ? window : global) ??
      {}
    );
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
        + (this.opts.env_path ? (this.opts.env_path.includes('\\') ? '\\' : '/') : '') // detect and use correct separator based on env_path
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
   * Loads settings from the file system, merging with any `default_settings` or `smart_env_settings`.
   * @returns {Promise<Object>} the loaded settings
   */
  async load_settings() {
    if (!(await this.data_fs.exists('smart_env.json'))) await this.save_settings({});
    // must deep copy default_settings to avoid mutating the original object (prevents unexpected behavior)
    let settings = JSON.parse(JSON.stringify(this.opts.default_settings || {})); // set defaults if provided
    deep_merge(settings, JSON.parse(await this.data_fs.read('smart_env.json'))); // load saved settings
    deep_merge(settings, this.opts?.smart_env_settings || {}); // overrides saved settings
    this._saved = true;
    return settings;
  }

  /**
   * Refreshes file-system state if exclusions changed,
   * then re-renders relevant settings UI
   */
  async update_exclusions() {
    this.smart_sources._fs = null;
    await this.smart_sources.fs.init();
    this.smart_sources.render_settings();
  }

  // DEPRECATED

  /** @deprecated access `this.state` and `collection.state` directly instead */
  get collections_loaded(){
    return this.state === 'loaded';
  }
  /** @deprecated Use this['main_class_name'] instead of this.main/this.plugin */
  get main() {
    return this.smart_env_configs[this.mains[0]].main;
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