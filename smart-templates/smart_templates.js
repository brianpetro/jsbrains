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

import { SmartSources } from '../smart-sources/smart_sources.js';
import { SmartTemplate } from './smart_template.js';

export class SmartTemplates extends SmartSources {
  constructor(env, opts = {}) {
    super(env, opts);
    this.template_adapters = {};
    this.default_output_mode = opts.default_output_mode || 'append-blocks';
    this.max_content_length = opts.max_content_length || 10000;
    this.template_adapters = opts.template_adapters || {};
    console.log("SmartTemplates: constructor");
    console.log("opts", opts);
    console.log("env", env);
  }
  static async load(env, opts = {}) {
    // prevent load of sources 
    const templates_collection_opts = {
      ...opts,
      adapter_class: env.opts.smart_collection_adapter_class,
      custom_collection_name: 'smart_templates',
    };
    if(env.opts.env_path) templates_collection_opts.env_path = env.opts.env_path;
    env.smart_templates = new opts.collections.smart_templates(env, templates_collection_opts);
    await env.smart_templates.init();
  }
  get item_type() { return SmartTemplate; }
  get templates_folder() { return this.opts.templates_folder || this.env.settings.templates_folder || 'smart-templates'; }
  get var_prompts() { return this.env.settings.var_prompts || {}; }
  get chat_model_platform_key() {
    return this.env.settings.smart_templates?.chat_model_platform_key
    || this.env.settings.chat_model_platform_key
    || 'openai';
  }
  get model_config() {
    return this.env.settings.smart_templates?.[this.chat_model_platform_key]
    || this.env.settings[this.chat_model_platform_key];
  }

  async init() {
    await this.fs.init(); // ensure fs is initialized with all files
    Object.values(this.fs.files)
      .filter(file => this.is_template(file)) // skip files without source adapter
      .forEach((file) => {
        console.log({file});
        this.items[file.path] = new this.item_type(this.env, { path: file.path });
      })
    ;
    await Promise.all(Object.values(this.items).map(item => item.init()));
  }

  is_template(file) {
    if(file.extension === 'json') return false; // skip json files (former var_prompts.json may be in smart-templates folder)
    if(file.path.startsWith(this.templates_folder)) return true;
    if(file.name.includes('.st')) return true;
    return false;
  }
}