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
export class SmartEnv {
  constructor(main, opts={}) {
    this.opts = opts;
    this.global_ref = this;
    const main_name = camel_case_to_snake_case(main.constructor.name);
    this[main_name] = main; // ex. smart_connections_plugin
    this[main_name+"_opts"] = opts;
    this.mains = [main_name];
    /**
     * @deprecated Use this.main_class_name instead of this.plugin
     */
    this.main = main; // DEPRECATED in favor of main class name converted to snake case
    /**
     * @deprecated Use this.main_class_name instead of this.plugin
     */
    this.plugin = this.main; // DEPRECATED in favor of main
    // Object.assign(this, opts); // DEPRECATED in favor using via this.opts
    this.loading_collections = false;
    this.collections_loaded = false;
    this.smart_embed_active_models = {};
    this._excluded_headings = null;
  }
  get global_prop() { return this.opts.global_prop ?? 'smart_env'; }
  get global_ref() { return this.opts.global_ref ?? (typeof window !== 'undefined' ? window : global) ?? {}; }
  set global_ref(env) { this.global_ref[this.global_prop] = env; }
  /**
   * Creates or updates a SmartEnv instance.
   * @param {Object} main - The main object to be added to the SmartEnv instance.
   * @param {Object} [opts={}] - Options for configuring the SmartEnv instance.
   * @returns {SmartEnv} The SmartEnv instance.
   * @throws {TypeError} If an invalid main object is provided.
   * @throws {Error} If there's an error creating or updating the SmartEnv instance.
   */
  static async create(main, opts = {}) {
    if (!main || typeof main !== 'object'){ // || typeof main.constructor !== 'function') {
      throw new TypeError('SmartEnv: Invalid main object provided');
    }
    console.log('opts', opts);

    let existing_env = opts.global_ref instanceof SmartEnv ? opts.global_ref : null;

    if (!existing_env) {
      main.env = new main.smart_env_class(main, opts);
      await main.env.init(main);
      return main.env;
    } else if (!(existing_env instanceof this)) { // SHOULD THIS BE REMOVED?
      // Create a new instance of the current class
      const new_env = new main.smart_env_class(main, opts);
      
      // Re-add existing mains to the new instance
      for (const main_name of existing_env.mains) {
        if (main_name !== camel_case_to_snake_case(main.constructor.name)) {
          await new_env.add_main(existing_env[main_name], existing_env[main_name + "_opts"]);
        }
      }
      
      // Initialize the new environment
      await new_env.init(main);
      
      // Replace the existing environment with the new one
      this.global_ref = new_env;
      main.env = new_env;
    } else {
      await existing_env.add_main(main, opts);
      main.env = existing_env;
    }

    return main.env;
  }
  get collections() { return this.opts.collections; }
  get ejs() { return this.opts.ejs; }
  get fs() {
    if(!this.smart_fs) this.smart_fs = new this.opts.smart_fs_class(this, {
      adapter: this.opts.smart_fs_adapter_class,
      fs_path: this.opts.env_path || '',
      exclude_patterns: this.excluded_patterns || [],
    });
    return this.smart_fs;
  }
  get item_types() { return this.opts.item_types; }
  // get settings() { return this.smart_env_settings._settings; }
  // set settings(settings) { this.smart_env_settings._settings = settings; }
  get settings() { return this.smart_env_settings.settings; }
  set settings(settings) { this.smart_env_settings.settings = settings; }
  get templates() { return this.opts.templates; }
  get views() { return this.opts.views; }

  /**
   * Adds a new main object to the SmartEnv instance.
   * @param {Object} main - The main object to be added.
   * @param {Object} [opts={}] - Options to be merged into the SmartEnv instance.
   */
  async add_main(main, opts = {}) {
    main.env = this;
    const main_name = camel_case_to_snake_case(main.constructor.name);
    this[main_name] = main;
    this.mains.push(main_name);
    this.merge_options(opts);
    // TODO: should special init be called (only init collections/modules not already initialized)
    await this.init(main);
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
          console.warn(`SmartEnv: Overwriting existing property ${key} with ${this.mains[this.mains.length-1]} smart_env_opts`);
        }
        this.opts[key] = value;
      }
    }
  }


  async init(main) {
    this.smart_env_settings = new SmartEnvSettings(this, this.opts);
    await this.smart_env_settings.load();
    console.log('smart_env_settings', this.smart_env_settings);
    await this.ready_to_load_collections(main);
    await this.init_collections();
    this.init_smart_change();
  }
  async ready_to_load_collections(main) {
    if(typeof main?.ready_to_load_collections === 'function') await main.ready_to_load_collections();
    return true;
  } // override in subclasses with env-specific logic
  async init_collections(){
    for(const key of Object.keys(this.opts.collections)){
      await this.opts.collections[key].init(this, this.opts);
    }
    if(!this.opts.prevent_load_on_init) await this.load_collections();
  }
  async load_collections(){
    this.loading_collections = true;
    for(const key of Object.keys(this.opts.collections)){
      if(typeof this[key]?.process_load_queue === 'function'){
        console.log('loading collection', key);
        await this[key].process_load_queue();
      }
    }
    this.loading_collections = false;
    this.collections_loaded = true;
  }
  unload_main(main_key) {
    this.unload_collections(main_key);
    this.unload_opts(main_key);
    this[main_key] = null;
    this.mains = this.mains.filter(key => key !== main_key);
    if(this.mains.length === 0) this.global_ref = null;
  }
  unload_collections(main_key) {
    for(const key of Object.keys(this.collections)){
      if(!this[main_key]?.smart_env_opts?.collections[key]) continue;
      this[key]?.unload();
      this[key] = null;
    }
  }
  unload_opts(main_key) {
    for(const opts_key of Object.keys(this.opts)){
      if(!this[main_key]?.smart_env_opts?.[opts_key]) continue;
      // if exists in another main, don't delete it
      if(this.mains.filter(m => m !== main_key).some(m => this[m]?.smart_env_opts?.[opts_key])) continue;
      this.opts[opts_key] = null;
    }
  }
  save() {
    for(const key of Object.keys(this.collections)){
      this[key].process_save_queue();
    }
  }

  // should probably be moved
  // smart-change
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