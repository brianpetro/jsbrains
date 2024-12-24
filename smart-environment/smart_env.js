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

/**
 * @class SmartEnv
 * @description 
 * The SmartEnv class represents a global runtime environment managing configuration, 
 * references to collections, modules, and a global scope. It ensures that only one instance 
 * of the environment is created and acts as a central point of coordination.
 */
export class SmartEnv {
  scope_name = 'smart_env';
  constructor(opts={}) {
    this.opts = opts;
    this.global_ref = this;
    this.loading_collections = false;
    this.collections_loaded = false;
    this.smart_embed_active_models = {};
    this._excluded_headings = null;
    this.collections = {}; // collection names to initialized classes
    this.is_init = true;
    this.mains = [];
    this._components = {};
    /**
     * @deprecated use main_env_config instead
     */
    this.main_opts = {};
  }
  /**
   * Creates or updates a SmartEnv instance.
   * @param {Object} main - The main object to be added to the SmartEnv instance.
   * @param {Object} [main_env_opts={}] - Options for configuring the SmartEnv instance.
   * @returns {SmartEnv} The SmartEnv instance.
   * @throws {TypeError} If an invalid main object is provided.
   * @throws {Error} If there's an error creating or updating the SmartEnv instance.
   */
  static async create(main, main_env_opts = {}) {
    if (!main || typeof main !== 'object'){ // || typeof main.constructor !== 'function') {
      throw new TypeError('SmartEnv: Invalid main object provided');
    }
    main_env_opts = normalize_opts(main_env_opts);
    let existing_env = main_env_opts.global_ref instanceof SmartEnv ? main_env_opts.global_ref : null;
    let main_key = null;
    if (!existing_env) {
      main.env = new this(main_env_opts);
      main_key = await main.env.init(main, main_env_opts);
    } else {
      main.env = existing_env;
      main_key = main.env.init_main(main, main_env_opts);
      await main.env.load_main(main_key);
    }
    return main.env;
  }
  async init(main, main_env_opts = {}) {
    this.is_init = true;
    const main_key = this.init_main(main, main_env_opts);
    await this.fs.load_files(); // skips exclusions (smart_sources.fs respects exclusions); runs before smart_settings for detecting env_data_dir
    await SmartSettings.create(this);
    await this.load_main(main_key);
    this.is_init = false;
    return main_key;
  }
  get main_env_config(){
    return this.mains.reduce((acc, key) => {
      acc[key] = this[key].smart_env_config;
      return acc;
    }, {});
  }
  /**
   * Adds a new main object to the SmartEnv instance.
   * @param {Object} main - The main object to be added.
   * @param {Object} [main_env_opts={}] - Options to be merged into the SmartEnv instance.
   */
  init_main(main, main_env_opts = {}) {
    const main_key = camel_case_to_snake_case(main.constructor.name);
    this[main_key] = main;
    this.mains.push(main_key);
    this.main_opts[main_key] = main_env_opts; // may be deprecated in favor of main_env_config
    this.merge_options(main_env_opts);
    return main_key;
  }
  async load_main(main_key) {
    const main_env_opts = this.main_opts[main_key];
    const main = this[main_key];
    await this.init_collections(main_env_opts); // init so settings can be accessed
    await this.ready_to_load_collections(main);
    // console.log('ready to load collections');
    const main_collections = Object.keys(main_env_opts.collections).reduce((acc, key) => {
      if(!this.collections[key]) return acc; // skip if not initialized
      acc[key] = this[key]; // add ref to collection instance to acc
      return acc;
    }, {});
    await this.load_collections(main_collections);
  }
  async init_collections(config=this.opts){
    for(const key of Object.keys(config.collections)){
      const _class = config.collections[key]?.class; // should always use `class` property since normalize_opts added ?? opts.collections[key];
      if(typeof _class?.init !== 'function') continue; // skip if not a class or does not have init method
      await _class.init(this, {...config.collections[key]});
    }
  }
  async load_collections(collections=this.collections){
    this.loading_collections = true;
    for(const key of Object.keys(collections)){
      if(this.is_init && (this.opts.prevent_load_on_init || collections[key].opts.prevent_load_on_init)) continue;
      if(typeof collections[key]?.process_load_queue === 'function'){
        await collections[key].process_load_queue();
      }
    }
    this.loading_collections = false;
    this.collections_loaded = true;
  }

  /**
   * Merges provided options into the SmartEnv instance, performing a deep merge for objects.
   * @param {Object} opts - Options to be merged.
   */
  merge_options(opts) {
    for (const [key, value] of Object.entries(opts)) {
      if(key === 'global_ref') continue;
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          this.opts[key] = [...(this.opts[key] || []), ...value];
        } else {
          if(!this.opts[key]) this.opts[key] = {};
          deep_merge_no_overwrite(this.opts[key], value);
        }
      } else {
        if (this.opts[key] !== undefined) {
          // console.warn(`SmartEnv: Overwriting existing property ${key} with ${this.mains[this.mains.length-1]} smart_env_config`);
        }
        this.opts[key] = value;
      }
    }
  }

  async ready_to_load_collections(main) {
    if(typeof main?.ready_to_load_collections === 'function') await main.ready_to_load_collections();
    return true;
  } // override in subclasses with env-specific logic
  unload_main(main_key) {
    this.unload_collections(main_key);
    this.unload_opts(main_key);
    this[main_key] = null;
    this.mains = this.mains.filter(key => key !== main_key);
    if(this.mains.length === 0) this.global_ref = null;
  }
  unload_collections(main_key) {
    for(const key of Object.keys(this.collections)){
      if(!this[main_key]?.smart_env_config?.collections[key]) continue;
      this[key]?.unload();
      this[key] = null;
    }
  }
  unload_opts(main_key) {
    for(const opts_key of Object.keys(this.opts)){
      if(!this[main_key]?.smart_env_config?.[opts_key]) continue;
      // if exists in another main, don't delete it
      if(this.mains.filter(m => m !== main_key).some(m => this[m]?.smart_env_config?.[opts_key])) continue;
      this.opts[opts_key] = null;
    }
  }
  save() {
    for(const key of Object.keys(this.collections)){
      this[key].process_save_queue();
    }
  }
  init_module(module_key, opts={}) {
    const module_config = this.opts.modules[module_key];
    if(!module_config) return console.warn(`SmartEnv: module ${module_key} not found`);
    opts = {
      ...{...module_config, class: null},
      ...opts,
    }
    return new module_config.class(opts);
  }
  get settings_template() { return this.opts.components?.smart_env?.settings || settings_template; }
  async render_settings(container=this.settings_container) {
    if(!this.settings_container || container !== this.settings_container) this.settings_container = container;
    if(!container) throw new Error("Container is required");
    const frag = await this.render_component('settings', this, {});
    container.innerHTML = '';
    container.appendChild(frag);
    return frag;
  }


  /**
   * Render settings.
   * @param {HTMLElement} [container] - Container element
   * @param {Object} [opts] - Render options
   * @returns {Promise<HTMLElement>} Container element
   */
  async render_component(component_key, scope, opts = {}) {
    const template = this.get_component(component_key, scope);
    const frag = await template(scope, opts);
    return frag;
  }
  get_component(component_key, scope) {
    const scope_name = scope.collection_key ?? scope.scope_name;
    const _cache_key = scope_name ? `${scope_name}-${component_key}` : component_key;
    if(!this._components[_cache_key]){
      try{
        if(this.opts.components[scope_name]?.[component_key]){
          this._components[_cache_key] = this.opts.components[scope_name][component_key].bind(this.init_module('smart_view'));
        }else if(this.opts.components[component_key]){
          this._components[_cache_key] = this.opts.components[component_key].bind(this.init_module('smart_view'));
        }else{
          console.warn(`SmartEnv: component ${component_key} not found for scope ${scope_name}`);
        }
      }catch(e){
        console.error('Error getting component', e);
        console.log(`scope_name: ${scope_name}; component_key: ${component_key}; this.opts.components: ${Object.keys(this.opts.components || {}).join(', ')}; this.opts.components[scope_name]: ${Object.keys(this.opts.components[scope_name] || {}).join(', ')}`);
      }
    }
    return this._components[_cache_key];
  }
  
  get smart_view() {
    if(!this._smart_view) this._smart_view = this.init_module('smart_view');
    return this._smart_view;
  }
  get settings_config(){
    return {
      "is_obsidian_vault": {
        name: "Obsidian Vault",
        description: "Toggle on if this is an Obsidian vault.",
        type: "toggle",
        default: false,
      },
      "file_exclusions": {
        name: "File Exclusions",
        description: "Comma-separated list of files to exclude.",
        type: "text",
        default: "",
        callback: 'update_exclusions',
      },
      "folder_exclusions": {
        name: "Folder Exclusions",
        description: "Comma-separated list of folders to exclude.",
        type: "text",
        default: "",
        callback: 'update_exclusions',
      },
      "excluded_headings": {
        name: "Excluded Headings",
        description: "Comma-separated list of headings to exclude.",
        type: "text",
        default: "",
      },
    }
  }
  get global_prop() { return this.opts.global_prop ?? 'smart_env'; }
  get global_ref() { return this.opts.global_ref ?? (typeof window !== 'undefined' ? window : global) ?? {}; }
  set global_ref(env) { this.global_ref[this.global_prop] = env; }
  get item_types() { return this.opts.item_types; }
  /**
   * @deprecated use component pattern instead
   */
  get ejs() { return this.opts.ejs; }
  /**
   * @deprecated use component pattern instead
   */
  get templates() { return this.opts.templates; }
  /**
   * @deprecated use component pattern instead
   */
  get views() { return this.opts.views; }


  get fs_module_config() { return this.opts.modules.smart_fs; }
  get fs() {
    if(!this.smart_fs){
      this.smart_fs = new this.fs_module_config.class(this, {
        adapter: this.fs_module_config.adapter,
        fs_path: this.opts.env_path || '',
      });
    }
    return this.smart_fs;
  }
  get env_data_dir() {
    const env_settings_files = this.fs.file_paths?.filter(path => path.endsWith('smart_env.json')) || [];
    let env_data_dir = '.smart-env';
    if(env_settings_files.length > 0){
      if(env_settings_files.length > 1){
        // get one with most files in it (filter file_paths that include the directory name)
        const env_data_dir_counts = env_settings_files.map(path => {
          const dir = path.split('/').slice(-2, -1)[0];
          return {
            dir,
            count: this.fs.file_paths.filter(path => path.includes(dir)).length
          };
        });
        env_data_dir = env_data_dir_counts.reduce((max, dir) => (dir.count > max.count) ? dir : max, env_data_dir_counts[0]).dir;
      }else{
        env_data_dir = env_settings_files[0].split('/').slice(-2, -1)[0];
      }
    }
    return env_data_dir;
  }
  get data_fs() {
    if (!this._fs){
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
   * @returns {Promise<void>} A promise that resolves when the settings have been saved.
   */
  async save_settings(settings) {
    this._saved = false;
    if (!await this.data_fs.exists('')) await this.data_fs.mkdir('');
    await this.data_fs.write(
      'smart_env.json',
      JSON.stringify(settings, null, 2)
    );
    this._saved = true;
  }
  /**
   * Loads the settings from the file system.
   * @returns {Promise<void>} A promise that resolves when the settings have been loaded.
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


  async update_exclusions(){
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
  get main() { return this[this.mains[this.mains.length-1]]; }
  /**
   * @deprecated Use this.main_class_name instead of this.plugin
   */
  get plugin() { return this.main; }

}

/**
 * Normalizes the options for the SmartEnv instance (mutates the object)
 * - converts camelCase keys in `collections` to snake_case
 * - ensures `collections` values are objects with a `class` property
 * @param {Object} opts - The options to normalize.
 * @returns {Object} the mutated options object
 */
function normalize_opts(opts) {
  Object.entries(opts.collections).forEach(([key, value]) => {
    if (typeof value === 'function') opts.collections[key] = { class: value };
    // if key is CamelCase, convert to snake_case
    if (key[0] === key[0].toUpperCase()) {
      opts.collections[camel_case_to_snake_case(key)] = { ...opts.collections[key] };
      delete opts.collections[key];
    }
  });
  Object.entries(opts.modules).forEach(([key, value]) => {
    if (typeof value === 'function') opts.modules[key] = { class: value };
    // if key is CamelCase, convert to snake_case
    if (key[0] === key[0].toUpperCase()) {
      opts.modules[camel_case_to_snake_case(key)] = { ...opts.modules[key] };
      delete opts.modules[key];
    }
  });
  return opts;
}

function camel_case_to_snake_case(str) {
  const result = str
    .replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
    .replace(/^_/, '') // remove leading underscore
    .replace(/2$/, '') // remove trailing 2 (bundled subclasses)
  ;
  return result;
}

/**
 * Deeply merges two objects without overwriting existing properties in the target object.
 * @param {Object} target - The target object to merge properties into.
 * @param {Object} source - The source object from which properties are sourced.
 * @returns {Object} The merged object.
 */
export function deep_merge_no_overwrite(target, source) {
  for (const key in source) {
    try{
      if (source.hasOwnProperty(key)) {
        if (is_obj(source[key])) {
          if (!target.hasOwnProperty(key) || !is_obj(target[key])) {
            target[key] = {};
          }
          deep_merge_no_overwrite(target[key], source[key]);
        } else if (!target.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
    }catch(e){
      console.warn(`deep_merge_no_overwrite error (${key}): ${e.message}`);
    }
  }
  return target;

  function is_obj(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
}
/**
 * Deeply merges two objects, giving precedence to the properties of the source object.
 * @param {Object} target - The target object to merge properties into.
 * @param {Object} source - The source object from which properties are sourced.
 * @returns {Object} The merged object.
 */
export function deep_merge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      // both exist and are objects
      if (is_obj(source[key]) && is_obj(target[key])) deep_merge(target[key], source[key]);
      else target[key] = source[key]; // precedence to source
    }
  }
  return target;
  function is_obj(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
}