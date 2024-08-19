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

export class SmartEnv {
  constructor(main, opts={}) {
    const main_name = camel_case_to_snake_case(main.constructor.name);
    this[main_name] = main; // ex. smart_connections_plugin
    this[main_name+"_opts"] = opts;
    this.mains = [main_name];
    Object.assign(this, opts);
    this.loading_collections = false;
    this.collections_loaded = false;
    /**
     * @deprecated Use this.main_class_name instead of this.plugin
     */
    this.main = main; // DEPRECATED in favor of main class name converted to snake case
    /**
     * @deprecated Use this.main_class_name instead of this.plugin
     */
    this.plugin = this.main; // DEPRECATED in favor of main
  }
  static create(main, opts={}) {
    const global_ref = opts.global_ref || window || global;
    const existing_smart_env = global_ref.smart_env;
    if(existing_smart_env) {
      const main_name = camel_case_to_snake_case(main.constructor.name);
      existing_smart_env[main_name] = main;
      existing_smart_env.mains.push(main_name);
      Object.keys(opts).forEach(key => {
        if(typeof opts[key] === 'object'){
          if(Array.isArray(opts[key])){
            existing_smart_env[key] = [
              ...(existing_smart_env[key] || []),
              ...opts[key]
            ];
          } else if(opts[key] !== null) {
            existing_smart_env[key] = {
              ...(existing_smart_env[key] || {}),
              ...opts[key]
            }
          }
        } else {
          if(existing_smart_env[key]) console.warn(`SmartEnv: Overwriting existing property ${key} with ${opts[key]}`);
          existing_smart_env[key] = opts[key];
        }
      });
      global_ref.smart_env = existing_smart_env;
    }else {
      global_ref.smart_env = new this(main, opts);
    }
    main.env = global_ref.smart_env;
    return global_ref.smart_env;
  }
  async init() {
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
    const settings = {};
    this.mains.forEach(main => {
      if(!settings[main]) settings[main] = {};
      Object.keys(this[main].settings || {}).forEach(setting => {
        settings[main][setting] = this[main].settings[setting];
      });
    });
    return settings;
  }
}

function camel_case_to_snake_case(str) {
  const result = str
    .replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
    .replace(/^_/, '') // remove leading underscore
  ;
  return result;
}