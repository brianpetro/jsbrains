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

export class SmartTemplates extends SmartSources {
  constructor(env, opts = {}) {
    super(env, opts);
    this.default_output_mode = opts.default_output_mode || 'append-blocks';
    this.max_content_length = opts.max_content_length || 10000;
  }
  static async load(env, opts = {}) {
    // prevent load of sources 
    const templates_collection_opts = {
      ...opts,
      adapter_class: env.opts.collections.smart_templates.data_adapter,
      custom_collection_key: 'smart_templates',
    };
    if(env.opts.env_path) templates_collection_opts.env_path = env.opts.env_path;
    env.smart_templates = new opts.collections.smart_templates(env, templates_collection_opts);
    await env.smart_templates.init();
  }

  async init() {
    await this.fs.init(); // ensure fs is initialized with all files
    Object.values(this.fs.files)
      .filter(file => this.is_template(file)) // skip files without source adapter
      .forEach((file) => {
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
  get chat_model() {
    if (!this._chat_model) {
      this._chat_model = new this.env.opts.modules.smart_chat_model.class({
        settings: this.settings.chat_model,
        adapters: this.env.opts.modules.smart_chat_model.adapters,
        http_adapter: this.env.opts.modules.smart_chat_model.http_adapter,
        re_render_settings: this.render_settings.bind(this),
      });
    }
    return this._chat_model;
  }
  get chat_model_settings() {
    return this.settings?.chat_model?.[this.settings.chat_model?.platform_key || 'openai'];
  }
  get chat_model_platform_key() {
    return this.env.settings.smart_templates?.chat_model_platform_key
    || this.env.settings.chat_model_platform_key
    || 'openai';
  }
  get item_type() { return SmartTemplate; }
  get model_config() {
    return this.env.settings.smart_templates?.[this.chat_model_platform_key]
    || this.env.settings[this.chat_model_platform_key];
  }
  get settings_config() {
    return this.process_settings_config(this.chat_model.settings_config, `chat_model`);
  }
  get template_adapters() {
    return this.opts.template_adapters || {};
  }
  get templates_folder() { return this.opts.templates_folder || this.env.settings.templates_folder || 'smart-templates'; }
  get var_prompts() { return this.env.settings.var_prompts || {}; }

  // TEMP SMART SOURCE OVERRIDES
  async process_load_queue(){}

  async detect_template(source_key) {
    const source = this.env.smart_sources.get(source_key);
    if (!source) return null;

    const content = await source.read();
    
    // Check each template for structural matches
    const matches = await Promise.all(
      Object.values(this.items).map(async template => {
        const {template: template_content} = await template.get_template();
        const match_score = await this.calculate_template_match_score(content, template_content);
        return {
          template_key: template.key,
          score: match_score
        };
      })
    );

    // Return best match if score exceeds threshold
    const best_match = matches.reduce((best, current) => 
      current.score > (best?.score || 0) ? current : best, null);
    
    return best_match?.score > 0.7 ? best_match.template_key : null;
  }

  async calculate_template_match_score(content, template_content) {
    // Extract structure (headings, block patterns) from both contents
    const content_structure = this.extract_structure(content);
    const template_structure = this.extract_structure(template_content);
    
    // Calculate similarity based on matching structural elements
    const matching_elements = content_structure.filter(element => 
      template_structure.includes(element));
    
    return matching_elements.length / template_structure.length;
  }

  extract_structure(content) {
    const structure = [];
    
    // Extract headings
    const heading_matches = content.match(/^#+\s+.+$/gm) || [];
    structure.push(...heading_matches);
    
    // Extract block patterns
    const block_matches = content.match(/^```[\s\S]*?```$/gm) || [];
    structure.push(...block_matches);
    
    return structure;
  }
}

import { SmartSource } from '../smart-sources/smart_source.js';
import ejs from './ejs.min.cjs';

export class SmartTemplate extends SmartSource {
  constructor(env, data) {
    super(env, data);
    this.variables = [];
    this._parsed_variables = null;
  }

  async init() {
    await super.init();
    await this.parse_variables();
  }

  async parse_variables() {
    if (!this._parsed_variables) {
      this._parsed_variables = await this.template_adapter.parse_variables();
  
      // Add variables to SmartTemplates _variables object
      if (!this.settings.var_prompts) {
        this.settings.var_prompts = {};
      }
      this._parsed_variables.forEach((variable, i) => {
        // Only apply var_prompts if prompt is not already set by template_opts
        if (!variable.prompt) {
          this._parsed_variables[i] = {
            ...variable,
            ...(this.settings.var_prompts?.[variable.name] || {}),
          };
        }
      });
    }
    return this._parsed_variables;
  }

  async get_chatml_tools(opts = {}) {
    const variables = await this.parse_variables();
    const properties = variables.reduce((acc, variable) => {
      const description = variable.prompt || `Value for ${variable.name}`;
      if (variable.type === 'array') {
        acc[variable.name] = {
          type: 'array',
          items: { type: 'string' }, // Assuming array of strings for simplicity
          description
        };
      } else {
        acc[variable.name] = {
          type: 'string',
          description
        };
      }
      return acc;
    }, {});
  
    return {
      type: "function",
      function: {
        name: "generate_content",
        description: "Generate arguments based on the CONTEXT." + (opts.system_prompt ? ` ${opts.system_prompt}` : ''),
        parameters: {
          type: "object",
          properties,
          required: variables.map(v => v.name)
        }
      }
    };
  }

  async get_template(){
    if(this.template_adapter.get_template) return await this.template_adapter.get_template();
    return {
      template: await this.read(), 
      template_opts: {}
    };
  }

  /**
   * Complete Method
   * Generates content using the chat model based on the provided context.
   * @param {Object} render_opts - Rendering options including context and system_prompt.
   * @returns {Object} - Generated content as key-value pairs.
   */
  async complete(render_opts = {}) {
    const { context, system_prompt } = render_opts;

    let merged_context = { ...context };

    if (render_opts.include_connections > 0) {
      const connections = await this.find_connections({ limit: render_opts.include_connections });
      merged_context.connections = connections;
    }

    const function_call_request = {
      messages: [
        {
          role: 'user',
          content: `---CONTEXT---\n${JSON.stringify(merged_context)}\n---END CONTEXT---`,
        }
      ],
      tools: [
        await this.get_chatml_tools({ system_prompt })
      ],
      tool_choice: {
        type: 'function',
        function: {
          name: 'generate_content'
        }
      },
      stream: false
    };

    if (system_prompt) {
      function_call_request.messages[0].content += `\n---IMPORTANT---\n${system_prompt}\n---END IMPORTANT---`;
      function_call_request.messages.unshift({ role: 'system', content: system_prompt });
    }

    const resp = await this.collection.chat_model.complete(function_call_request);
    const generated_content = JSON.parse(resp.choices[0].message.tool_calls[0].function.arguments);

    Object.entries(generated_content).forEach(([key, value]) => {
      if (typeof value !== 'string' && typeof value !== 'number') {
        generated_content[key] = value ? JSON.stringify(value, null, 2) : '';
      }
    });

    Object.assign(merged_context, generated_content);

    return merged_context;
  }

  /**
   * Render Method
   * Renders the EJS template using the provided context.
   * @param {Object} context - Contextual data for rendering the template.
   * @returns {string} - Rendered content.
   */
  async render(context = {}) {
    const { template, template_opts } = await this.get_template();
    const { 
      to_key, 
      output_mode = this.env.smart_templates.default_output_mode, 
    } = template_opts;

    const ejs_template = this.template_adapter.convert_to_ejs(template);
    const rendered_content = ejs.render(ejs_template, context);

    if (rendered_content.length > this.env.smart_templates.max_content_length) {
      throw new Error(`Rendered content exceeds maximum length of ${this.env.smart_templates.max_content_length} characters`);
    }

    const target_source = this.env.smart_sources?.get(to_key || this.key);
    if (target_source) {
      switch (output_mode) {
        case 'append-blocks':
          await target_source.append(rendered_content);
          break;
        case 'replace-blocks':
          await target_source.merge(rendered_content, { mode: 'replace_blocks' });
          break;
        case 'replace-all':
          await target_source.update(rendered_content);
          break;
        default:
          throw new Error(`Invalid output_mode: ${output_mode}`);
      }
    }

    return rendered_content;
  }

  /**
   * Complete and Render Method
   * Performs both completion and rendering in one step.
   * @param {Object} render_opts - Rendering options including context and system_prompt.
   * @returns {string} - Rendered content after completion.
   */
  async complete_and_render(render_opts = {}) {
    const completed_context = await this.complete(render_opts);
    const ejs_template = await this.get_ejs_template();
    const all_variables = (await this.ejs_template_adapter.parse_variables(ejs_template)).reduce((acc, v) => {
      acc[v.name] = v.prompt;
      return acc;
    }, {});
    const full_context = { ...all_variables, ...completed_context };
    const rendered_content = await this.render(full_context);
    return rendered_content;
  }

  async get_ejs_template() {
    const {template, template_opts} = await this.get_template();
    return this.template_adapter.convert_to_ejs(template);
  }

  get template_adapter() {
    if (!this._template_adapter) {
      const AdapterClass = this.collection.template_adapters[this.file_type] || this.env.smart_templates.template_adapters.default;
      this._template_adapter = new AdapterClass(this);
    }
    return this._template_adapter;
  }
  get ejs_template_adapter() {
    if(!this._ejs_template_adapter) {
      this._ejs_template_adapter = new (this.collection.template_adapters.ejs || this.env.smart_templates.template_adapters.ejs)(this);
    }
    return this._ejs_template_adapter;
  }

  async progressive_completion(render_opts = {}) {
    const variables = await this.parse_variables();
    const context = { ...render_opts.context };
    const results = [];

    for (const variable of variables) {
      // Generate partial template with completed variables so far
      const partial_context = { ...context, ...Object.fromEntries(results) };
      const partial_template = await this.render(partial_context);

      // Perform lookup if enabled
      if (render_opts.lookup) {
        const lookup_results = await this.collection.env.smart_sources.lookup({
          content: partial_template,
          limit: render_opts.lookup_n || 3
        });
        context.lookup_results = lookup_results;
      }

      // Generate completion for current variable
      const completion = await this.complete({
        ...render_opts,
        context: {
          ...context,
          current_variable: variable.name,
          current_prompt: variable.prompt,
          partial_template
        }
      });

      results.push([variable.name, completion[variable.name]]);
    }

    return Object.fromEntries(results);
  }

  async progressive_render(render_opts = {}) {
    const completed_context = await this.progressive_completion(render_opts);
    return this.render(completed_context);
  }

  async create_template_output(content, opts = {}) {
    const target_key = opts.target_key || this.key;
    const target = this.collection.env.smart_sources.get(target_key);
    
    if (!target) {
      // Create new file if target doesn't exist
      await this.collection.env.smart_sources.create({
        key: target_key,
        content
      });
      return;
    }

    const existing_content = await target.read();
    
    if (opts.create_or_update && !await this.collection.detect_template(target_key)) {
      // Create new if target exists but isn't a template
      const new_key = `${target_key}.template`;
      await this.collection.env.smart_sources.create({
        key: new_key,
        content
      });
      return;
    }

    // Update existing content based on output_mode
    await this.render({
      ...opts,
      context: { existing_content, ...opts.context },
      to_key: target_key
    });
  }

  async prepare_context(render_opts = {}) {
    let context = { ...render_opts.context };

    // Handle include_connections
    if (render_opts.include_connections > 0) {
      const connections = await this.find_connections({ 
        limit: render_opts.include_connections 
      });
      context.connections = connections;
    }

    // Handle lookup_template if specified
    if (render_opts.lookup_template) {
      const lookup_template = this.collection.get(render_opts.lookup_template);
      if (lookup_template) {
        const lookup_results = await lookup_template.complete({
          context,
          lookup: true,
          lookup_n: render_opts.lookup_n
        });
        context.lookup_results = lookup_results;
      }
    }

    return context;
  }
}