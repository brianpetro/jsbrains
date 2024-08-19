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
export class SmartEnv {
  constructor(main, opts={}) {
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
    Object.assign(this, opts);
    this.loading_collections = false;
    this.collections_loaded = false;
    this.smart_env_settings = new SmartEnvSettings(this, {
      env_path: opts.env_path || '/',
      smart_env_data_folder: opts.smart_env_data_folder
    });
  }
  /**
   * Creates or updates a SmartEnv instance.
   * @param {Object} main - The main object to be added to the SmartEnv instance.
   * @param {Object} [opts={}] - Options for configuring the SmartEnv instance.
   * @param {Object} [opts.global_ref] - Custom global reference (e.g., for testing).
   * @returns {SmartEnv} The SmartEnv instance.
   * @throws {TypeError} If an invalid main object is provided.
   * @throws {Error} If there's an error creating or updating the SmartEnv instance.
   */
  static create(main, opts = {}) {
    if (!main || typeof main !== 'object'){ // || typeof main.constructor !== 'function') {
      throw new TypeError('SmartEnv: Invalid main object provided');
    }

    const global_ref = opts.global_ref || (typeof window !== 'undefined' ? window : global);
    let smart_env = global_ref.smart_env;

    try {
      if (!smart_env) {
        smart_env = new this(main, opts);
        global_ref.smart_env = smart_env;
      } else {
        smart_env.add_main(main, opts);
      }

      main.env = smart_env;
      return smart_env;
    } catch (error) {
      console.error('SmartEnv: Error creating or updating SmartEnv instance', error);
      throw error;
    }
  }

  /**
   * Adds a new main object to the SmartEnv instance.
   * @param {Object} main - The main object to be added.
   * @param {Object} [opts={}] - Options to be merged into the SmartEnv instance.
   */
  add_main(main, opts = {}) {
    const main_name = camel_case_to_snake_case(main.constructor.name);
    this[main_name] = main;
    this.mains.push(main_name);
    this.merge_options(opts);
  }

  /**
   * Merges provided options into the SmartEnv instance.
   * @param {Object} opts - Options to be merged.
   */
  merge_options(opts) {
    for (const [key, value] of Object.entries(opts)) {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          this[key] = [...(this[key] || []), ...value];
        } else {
          this[key] = { ...(this[key] || {}), ...value };
        }
      } else {
        if (this[key] !== undefined) {
          console.warn(`SmartEnv: Overwriting existing property ${key} with ${value}`);
        }
        this[key] = value;
      }
    }
  }

  async init() {
    await this.smart_env_settings.load();
    await this.ready_to_load_collections();
    await this.init_collections();
    await this.load_collections();
    await this.smart_sources.import();
  }
  async ready_to_load_collections() { return true; } // override in subclasses with env-specific logic
  async init_collections() {
    for (const [key, collection_class] of Object.entries(this.collections)) {
      new collection_class(this, {
        adapter_class: this.main.smart_env_opts.smart_collection_adapter_class,
        custom_collection_name: key, // unnecessary??
      });
      await this[key].init();
    }
  }
  async load_collections() {
    try{
      this.loading_collections = true;
      for (const key of Object.keys(this.collections)) {
        await this[key].load();
      }
    }catch(err){
      console.error(err);
    }
    this.loading_collections = false;
    this.collections_loaded = true;
  }
  unload_collections() {
    for(const key of Object.keys(this.collections)){
      this[key].unload();
      this[key] = null;
    }
  }
  // NEEDS REVIEW: saves all collections (Likely DEPRECATED: may only need to save smart_sources)
  save() {
    for(const key of Object.keys(this.collections)){
      this[key].save();
    }
  }
  // NEEDS REVIEW: Can unload/reload be handled better?
  unload() {
    this.unload_collections();
    this.smart_embed_active_models = {};
  }
  async reload() {
    this.unload();
    await this.init();
  }
  async reload_collections() {
    console.log("Smart Connections: reloading collections");
    this.unload_collections();
    if(this.loading_collections) this.loading_collections = false; // reset flag
    await this.init_collections();
    await this.load_collections();
  }
  // NEEDS REVIEW:
  get settings() {
    return this.smart_env_settings._settings;
    // const settings = {};
    // this.mains.forEach(main => {
    //   if(!settings[main]) settings[main] = {};
    //   Object.keys(this[main].settings || {}).forEach(setting => {
    //     settings[main][setting] = this[main].settings[setting];
    //   });
    // });
    // return settings;
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