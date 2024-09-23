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

import { SmartEnvSettings } from './smart_env_settings.js';
import { SmartChange } from 'smart-change/smart_change.js';
import { DefaultAdapter } from 'smart-change/adapters/default.js';
import { MarkdownAdapter } from 'smart-change/adapters/markdown.js';
import { ObsidianMarkdownAdapter } from 'smart-change/adapters/obsidian_markdown.js';
import { template as settings_template } from './components/settings.js';

export class SmartEnv {
  constructor(opts={}) {
    this.opts = opts;
    this.global_ref = this;
    this.loading_collections = false;
    this.collections_loaded = false;
    this.smart_embed_active_models = {};
    this._excluded_headings = null;
    this.collections = {}; // collection names to initialized classes
    this.smart_env_settings = null;
    this.is_init = true;
    this.mains = [];
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
    if (!existing_env) {
      main.env = new this(main_env_opts);
      await main.env.init(main, main_env_opts);
    } else {
      main.env = existing_env;
      const main_key = main.env.init_main(main, main_env_opts);
      await main.env.load_main(main_key);
    }
    return main.env;
  }
  async init(main, main_env_opts = {}) {
    const main_key = this.init_main(main, main_env_opts);
    this.is_init = true;
    this.smart_env_settings = new SmartEnvSettings(this, this.opts);
    await this.smart_env_settings.load();
    await this.load_main(main_key);
    this.init_smart_change();
    this.is_init = false;
  }
  /**
   * Adds a new main object to the SmartEnv instance.
   * @param {Object} main - The main object to be added.
   * @param {Object} [main_env_opts={}] - Options to be merged into the SmartEnv instance.
   */
  init_main(main, main_env_opts = {}) {
    const main_key = camel_case_to_snake_case(main.constructor.name);
    this[main_key] = main;
    // this[main_name+"_opts"] = main_env_config; // DEPRECATED/UNUSED?
    this.mains.push(main_key);
    this.main_opts[main_key] = main_env_opts;
    this.merge_options(main_env_opts);
    return main_key;
  }
  async load_main(main_key) {
    const main_env_opts = this.main_opts[main_key];
    const main = this[main_key];
    await this.init_collections(main_env_opts); // init so settings can be accessed
    await this.ready_to_load_collections(main);
    console.log('ready to load collections');
    const main_collections = Object.keys(main_env_opts.collections).reduce((acc, key) => {
      if(!this.collections[key]) return acc; // skip if not initialized
      acc[key] = this[key]; // add ref to collection instance to acc
      return acc;
    }, {});
    await this.load_collections(main_collections);
    this.smart_env_settings.load_main_settings(main_key);
  }
  async init_collections(opts){
    if(!opts) opts = this.opts;
    for(const key of Object.keys(opts.collections)){
      const _class = opts.collections[key]?.class; // should always use `class` property since normalize_opts added ?? opts.collections[key];
      if(typeof _class?.init !== 'function') continue; // skip if not a class or does not have init method
      await _class.init(this, this.opts);
    }
  }
  async load_collections(collections=this.collections){
    this.loading_collections = true;
    for(const key of Object.keys(collections)){
      if(this.is_init && (this.opts.prevent_load_on_init || collections[key].opts.prevent_load_on_init)) continue;
      if(typeof collections[key]?.process_load_queue === 'function'){
        console.log('loading collection', key);
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
          // console.warn(`SmartEnv: Overwriting existing property ${key} with ${value}`);
          console.warn(`SmartEnv: Overwriting existing property ${key} with ${this.mains[this.mains.length-1]} smart_env_config`);
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
  init_module(module_name, opts={}) {
    if(!this.opts.modules[module_name]) return console.warn(`SmartEnv: module ${module_name} not found`);
    if(this.opts.modules[module_name].class){
      const _class = this.opts.modules[module_name].class;
      opts = {
        ...{...this.opts.modules[module_name], class: null},
        ...opts,
      }
      return new _class(this, opts);
    }else{
      return new this.opts.modules[module_name](this, opts);
    }
  }
  async render_settings(opts = {}) {
    const frag = await settings_template.call(this.smart_view, this, opts);
    if(opts.container){
      opts.container.innerHTML = '';
      opts.container.appendChild(frag);
    }
    return frag;
  }
  // should probably be moved
  init_smart_change() {
    if(typeof this.settings?.smart_changes?.active !== 'undefined' && !this.settings.smart_changes.active) return console.warn('smart_changes disabled by settings');
    this.smart_change = new SmartChange(this, { adapters: this.smart_change_adapters });
  }

  get smart_change_adapters() {
    return {
      default: new DefaultAdapter(),
      markdown: new MarkdownAdapter(),
      obsidian_markdown: new ObsidianMarkdownAdapter(),
    };
  }
  // NEEDS REVIEW
  get excluded_patterns() {
    return [
      ...(this.file_exclusions?.map(file => `${file}**`) || []),
      ...(this.folder_exclusions || []).map(folder => `${folder}**`),
      this.opts.env_data_dir + "/**",
    ];
  }
  get file_exclusions() {
    return (this.settings.file_exclusions?.length) ? this.settings.file_exclusions.split(",").map((file) => file.trim()) : [];
  }
  get folder_exclusions() {
    return (this.settings.folder_exclusions?.length) ? this.settings.folder_exclusions.split(",").map((folder) => {
      folder = folder.trim();
      if (folder.slice(-1) !== "/") return folder + "/";
      return folder;
    }) : [];
  }
  get excluded_headings() {
    if (!this._excluded_headings){
      this._excluded_headings = (this.settings.excluded_headings?.length) ? this.settings.excluded_headings.split(",").map((heading) => heading.trim()) : [];
    }
    return this._excluded_headings;
  }
  get smart_view() {
    if(!this._smart_view) this._smart_view = this.init_module('smart_view');
    return this._smart_view;
  }
  get settings_config(){
    return {
      "env_data_dir": {
        type: 'folder',
        name: 'Environment Data Directory',
        description: 'The directory where the environment data is stored.',
        default: '.smart-env'
      }
    }
  }
  get ejs() { return this.opts.ejs; }
  get fs() {
    if(!this.smart_fs){
      const fs_config = this.opts.modules.smart_fs;
      const fs_class = fs_config?.class ?? fs_config;
      this.smart_fs = new fs_class(this, {
        adapter: fs_config.adapter,
        fs_path: this.opts.env_path || '',
        exclude_patterns: this.excluded_patterns || [],
      });
    }
    return this.smart_fs;
  }
  get global_prop() { return this.opts.global_prop ?? 'smart_env'; }
  get global_ref() { return this.opts.global_ref ?? (typeof window !== 'undefined' ? window : global) ?? {}; }
  set global_ref(env) { this.global_ref[this.global_prop] = env; }
  get item_types() { return this.opts.item_types; }
  // get settings() { return this.smart_env_settings._settings; }
  // set settings(settings) { this.smart_env_settings._settings = settings; }
  get settings() { return this.smart_env_settings.settings; }
  set settings(settings) { this.smart_env_settings.settings = settings; }
  get smart_view() {
    if(!this._smart_view){
      this._smart_view = new this.opts.modules.smart_view.class(this, {adapter: this.opts.modules.smart_view.adapter});
    }
    return this._smart_view;
  }
  get templates() { return this.opts.templates; }
  get views() { return this.opts.views; }
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
  }
  return target;

  function is_obj(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
}