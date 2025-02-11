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
import { deep_merge_no_overwrite } from './utils/deep_merge_no_overwrite.js';
import { deep_remove_exclusive_props } from './utils/deep_remove_exclusive_props.js';
import { camel_case_to_snake_case } from './utils/camel_case_to_snake_case.js';
import { normalize_opts } from './utils/normalize_opts.js';
import { deep_clone_config } from './utils/deep_clone_config.js';

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
  static version = 1;

  scope_name = 'smart_env';

  constructor(opts = {}) {
    this.opts = deep_clone_config(opts);
    // must use original ref for global_ref
    this.opts.global_ref = opts.global_ref;
    this.loading_collections = false;
    this.collections_loaded = false;
    this.smart_embed_active_models = {};
    this._excluded_headings = null;
    this.collections = {}; // collection names to initialized classes
    this.is_init = true;
    this.mains = [];
    this._components = {};
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
          if (window.smart_env && window.smart_env.mains.includes(opts.main)) {
            clearInterval(interval);
            resolve(window.smart_env);
          }
        }, 1000);
      } else {
        const interval = setInterval(() => {
          if (window.smart_env && window.smart_env.collections_loaded) {
            clearInterval(interval);
            resolve(window.smart_env);
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
  static async create(main, main_env_opts = {}) {
    if (!main || typeof main !== 'object') {
      throw new TypeError('SmartEnv: Invalid main object provided');
    }
    main_env_opts = normalize_opts(main_env_opts);

    // The 'global_ref' in main_env_opts is actually the global object (Node's `global` or browser's `window`).
    // So we check if that global object has a .smart_env instance. If it does, we'll reuse or reload it.
    const global_obj =
      main_env_opts.global_ref ||
      (typeof window !== 'undefined' ? window : global)
    ;

    let global_env = null;
    const global_prop = main_env_opts.global_prop ?? 'smart_env';
    if (global_obj[global_prop]?.scope_name === 'smart_env') {
      global_env = global_obj[global_prop];
    }

    // BREAKS REFERENCES TO INITIAL ENV
    // // Detect if there's an older environment version and reload if needed
    // if (global_env && (global_env.constructor.version || 0) < this.version) {
    //   console.warn(
    //     `SmartEnv: A newer version (${this.version}) is being used, while the existing environment is (${global_env.constructor.version}). Reloading environment...`
    //   );
    //   await this.reload_all_mains(global_env, main, main_env_opts);
    //   return main.env; // after reload, main.env is replaced by the new environment
    // }

    // If the global object has `smart_env` and it's the same or newer version, reuse it.
    let main_key;
    if (!global_env) {
      // No existing environment, create a new one
      main.env = new this(main_env_opts);
      main.env.global_env = main.env;
      main_key = await main.env.init(main, main_env_opts);
    } else {
      console.log('Reusing existing environment', main.constructor.name);
      // Reuse the existing environment
      main.env = global_env;
      main_key = main.env.init_main(main, main_env_opts);
      await main.env.load_main(main_key, main_env_opts);
    }
    return main.env;
  }

  // BREAKS REFERENCES TO INITIAL ENV
  // /**
  //  * Reloads the entire environment if a newer SmartEnv version is loaded,
  //  * re-initializing each main in the old environment within the new environment.
  //  * @private
  //  * @param {SmartEnv} old_env - The existing environment instance to be replaced.
  //  * @param {Object} main - The main object that triggered the reload.
  //  * @param {Object} main_env_opts - The environment options to apply to that main.
  //  */
  // static async reload_all_mains(old_env, main, main_env_opts) {
  //   console.log('Reloading all mains');
  //   // Grab references to all mains so we can re-create them
  //   const old_mains_data = old_env.mains.map((mkey) => [
  //     mkey,
  //     old_env[mkey],
  //     old_env[mkey]?.smart_env_config
  //   ]);

  //   // Unload old environment's mains
  //   for (const [mkey, mobj] of old_mains_data) {
  //     if (mobj) mobj.env = null;
  //     old_env.unload_main(mkey);
  //   }
  //   old_env.global_env = null; // Remove old env from the global scope

  //   // Create the new environment for the main that triggered reload
  //   const new_env = new this(main_env_opts);
  //   new_env.global_env = new_env;
  //   await new_env.init(main, main_env_opts);

  //   // Re-init all old mains except the new one
  //   for (const [mkey, mobj, mconfig] of old_mains_data) {
  //     if (!mobj || mobj === main) continue;
  //     await this.create(mobj, mconfig);
  //   }
  // }

  /**
   * Initializes SmartEnv internals, then loads the provided main's collections.
   * @param {Object} main - The main object to initialize.
   * @param {Object} [main_env_opts={}]
   * @returns {String} The main key used to store the main object on `this`.
   */
  async init(main, main_env_opts = {}) {
    this.is_init = true;
    const main_key = this.init_main(main, main_env_opts);
    await this.fs.load_files(); // skip exclusions; detect env_data_dir
    await SmartSettings.create(this);
    await this.load_main(main_key, main_env_opts);
    this.is_init = false;
    return main_key;
  }

  /**
   * Returns a combined environment config for all known mains.
   * @returns {Object}
   */
  get main_env_config() {
    return this.mains.reduce((acc, key) => {
      acc[key] = this[key].smart_env_config;
      return acc;
    }, {});
  }

  /**
   * Adds a new main object to the SmartEnv instance (or reuses existing).
   * @param {Object} main - The main object to be added.
   * @param {Object} [main_env_opts={}]
   * @returns {String} The main key (snake_case of the main's constructor name)
   */
  init_main(main, main_env_opts = {}) {
    const main_key = camel_case_to_snake_case(main.constructor.name);

    // Only push if we haven't seen it yet
    if (!this.mains.includes(main_key)) {
      this.mains.push(main_key);
    }
    this[main_key] = main;
    this.merge_options(main_env_opts);
    return main_key;
  }

  /**
   * Loads the collections for the given main.
   * @param {String} main_key
   * @param {Object} main_env_opts
   */
  async load_main(main_key, main_env_opts) {
    const main = this[main_key];
    if (!main_env_opts) main_env_opts = main.smart_env_config;
    await this.init_collections(main_env_opts); // init so settings can be accessed
    await this.ready_to_load_collections(main);
    const main_collections = Object.keys(main_env_opts.collections || {}).reduce(
      (acc, key) => {
        if (!this.collections[key]) return acc; // skip if not initialized
        acc[key] = this[key]; // add ref to collection instance to acc
        return acc;
      },
      {}
    );
    await this.load_collections(main_collections);
  }

  /**
   * Initializes collection classes if they have an 'init' function.
   * @param {Object} [config=this.opts]
   */
  async init_collections(config = this.opts) {
    for (const key of Object.keys(config.collections || {})) {
      const _class = config.collections[key]?.class;
      if (typeof _class?.init !== 'function') continue; // skip if not a class or no init
      await _class.init(this, { ...config.collections[key] });
    }
  }

  /**
   * Loads any available collections, processing their load queues.
   * @param {Object} [collections=this.collections] - Key-value map of collection instances.
   */
  async load_collections(collections = this.collections) {
    this.loading_collections = true;
    for (const key of Object.keys(collections || {})) {
      if (
        this.is_init &&
        (this.opts.prevent_load_on_init || collections[key].opts.prevent_load_on_init)
      ) {
        continue;
      }
      if (typeof collections[key]?.process_load_queue === 'function') {
        await collections[key].process_load_queue();
      }
    }
    this.loading_collections = false;
    this.collections_loaded = true;
  }

  /**
   * Merges provided options into the SmartEnv instance, performing a deep merge for objects.
   * @param {Object} opts
   */
  merge_options(opts) {
    for (const [key, value] of Object.entries(opts)) {
      if (key === 'global_ref') continue;
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          this.opts[key] = [...(this.opts[key] || []), ...value];
        } else {
          if (!this.opts[key]) this.opts[key] = {};
          deep_merge_no_overwrite(this.opts[key], value);
        }
      } else {
        if (this.opts[key] !== undefined) {
          console.warn(
            `SmartEnv: Overwriting existing property ${key} with ${
              this.mains[this.mains.length - 1]
            } smart_env_config`
          );
        }
        this.opts[key] = value;
      }
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
   * Unloads a specific main and its collections from the environment.
   * @param {string} main_key
   * @param {Object|null} [unload_config=null]
   */
  unload_main(main_key, unload_config = null) {
    console.log('unload_main', main_key);
    this._components = {}; // clear component cache
    this.unload_collections(main_key, unload_config);
    if (this.mains.length > 1) {
      this.unload_opts(main_key, unload_config);
    } else {
      this.opts = {};
    }
    this[main_key] = null;
    this.mains = this.mains.filter((key) => key !== main_key);
    if (this.mains.length === 0) {
      this.global_env = null;
    }
  }

  /**
   * Unloads the collections referenced by the main being removed.
   * @param {string} main_key
   * @param {Object|null} [unload_config=null]
   */
  unload_collections(main_key, unload_config = null) {
    console.log('unload_collections', main_key);
    if (!unload_config) unload_config = this[main_key]?.smart_env_config;
    if (!unload_config) return;
    for (const ckey of Object.keys(unload_config.collections || {})) {
      if (!this[ckey]) continue;
      this[ckey].unload?.();
      this[ckey] = null;
    }
  }

  /**
   * Removes from `this.opts` any object properties that are exclusive to the main being removed.
   * Skips classes/functions, arrays, etc. Only plain objects are deeply iterated.
   * @param {string} main_key - The main key being unloaded.
   * @param {Object|null} [unload_config=null]
   */
  unload_opts(main_key, unload_config = null) {
    if (!unload_config) unload_config = this[main_key]?.smart_env_config;
    if (!unload_config) return;
    const keep_configs = this.mains
      .filter((m) => m !== main_key)
      .map((m) => this[m]?.smart_env_config)
      .filter(Boolean);
    deep_remove_exclusive_props(this.opts, unload_config, keep_configs);
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
  get global_env() {
    return this.global_ref[this.global_prop];
  }
  set global_env(env) {
    this.global_ref[this.global_prop] = env;
  }

  get item_types() {
    return this.opts.item_types;
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

  // /**
  //  * Returns the config object for the SmartEnv instance.
  //  * @returns {Object} The config object.
  //  */
  // get config() {
  //   // TODO: merge custom actions and components from smart-env folder and cache resulting object
  //   return this.opts;
  // }

  // DEPRECATED
  /**
   * @deprecated Use this.main_class_name instead of this.plugin
   */
  get main() {
    return this[this.mains[this.mains.length - 1]];
  }
  /**
   * @deprecated Use this.main_class_name instead of this.plugin
   */
  get plugin() {
    return this.main;
  }
}
