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

import ejs from './ejs.min.cjs';
import { SmartChatModel } from 'smart-chat-model';

export class SmartTemplates {
  constructor(main = {}, opts = {}) {
    this.main = main;
    this.opts = opts;
    this.adapter = opts.adapter || null; // DEPRECATED: in favor of file_type_adapters
    this.file_type_adapters = {};
    if(opts.file_type_adapters) {
      for(const adapter_class of opts.file_type_adapters) {
        const adapter = new adapter_class(this);
        for(const file_type of adapter.file_types) {
          this.file_type_adapters[file_type] = adapter;
        }
      }
    }
    if(opts.read_adapter) this.read_adapter = opts.read_adapter;
    else throw new Error("opts.read_adapter is required (ex. async (path) => await fs.promises.readFile(path, 'utf8'))");
    this._templates = {};
  }
  static async load(env, opts = {}) {
    env.smart_templates = new SmartTemplates(env, opts);
    await env.smart_templates.init();
    return env.smart_templates;
  }
  async init() {
    // RESERVED
  }
  get request_adapter() { return this.opts.request_adapter || null; }
  get settings() { return this.main.settings; }
  get var_prompts() { return this.settings.smart_templates?.var_prompts || {}; }
  get api_key() { return this.settings.smart_templates?.api_key; }
  get file_types() {
    return [
      ...Object.keys(this.file_type_adapters),
      'ejs',
    ];
  }
  get_adapter_by(file_type){ return this.file_type_adapters[file_type]; }
  // EJS template base syntax engine
  async get_template(template, opts = {}) {
    if(typeof template !== 'string') throw new Error('Template must be a string');
    if(this._templates[template]) template = this._templates[template];
    const adapter = this.get_adapter_by(opts.file_type || template.split('.').pop());
    if(typeof adapter?.get_template === 'function') return await adapter.get_template(template);
    if (!template.includes('\n') && this.file_types.includes(template.split('.').pop())) {
      template = await this.load_template(template);
    }
    if (typeof adapter?.convert_to_ejs === 'function') {
      template = adapter.convert_to_ejs(template);
    }
    return template;
  }

  async load_template(pointer) {
    try {
      let template = await this.read_adapter(pointer);
      // // if is buffer, convert to string (WARNING: breaks Obsidian mobile)
      // if (typeof Buffer?.isBuffer === 'function' && Buffer.isBuffer(template)) {
      //   template = template.toString();
      // }
      return template;
    } catch (error) {
      console.error(`Error loading template from ${pointer}:`, error.message, error.stack);
      return '';
    }
  }

  // Get variables from EJS template
  async get_variables(pointer, opts = {}) {
    let variables = [];
    const file_type = opts.file_type || pointer.split('.').pop();
    const adapter = this.get_adapter_by(file_type);
    if (adapter && typeof adapter.get_variables === 'function') {
      return await adapter.get_variables(pointer, opts);
    }
    const template = await this.get_template(pointer, opts);
    const regex = /<%[-_=]?\s*=?\s*([\w.]+(\[\w+])?)\s*[-_]?%>/g;
    let match;
    while ((match = regex.exec(template)) !== null) {
      const variable = match[1];
      const mainVariable = variable.split(/\[|\./)[0].trim();
      const prompt = this.var_prompts[mainVariable]?.prompt || null;
      variables.push({ name: mainVariable, prompt });
    }
    return variables;
  }

  async get_chatml_tools(variables, opts = {}) {
    const properties = variables.reduce((acc, variable) => {
      acc[variable.name] = { type: 'string', description: variable.prompt || 'TODO' };
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
          required: variables.map(variable => variable.name)
        }
      }
    };
  }

  // Get view data using the function call output
  async get_view_data(output) {
    if (this.adapter && typeof this.adapter.get_view_data === 'function') {
      return this.adapter.get_view_data(output);
    }
    return output;
  }

  // Render template with context and options
  async render(template, context, opts = {}) {
    const template_content = await this.get_template(template, opts);
    const variables = await this.get_variables(template, opts);
    const mergedContext = { context, ...opts };
    variables.forEach(variable => {
      mergedContext[variable.name] = 'EMPTY';
    });

    const functionCallRequest = {
      messages: [
        {
          role: 'user',
          content: `---CONTEXT---\n${context}\n---END CONTEXT---`,
        }
      ],
      tools: [
        await this.get_chatml_tools(variables, opts)
      ],
      tool_choice: {
        type: 'function',
        function: {
          name: 'generate_content'
        }
      },
      stream: false
    };
    if(opts.system_prompt){
      functionCallRequest.messages[0].content += `\n---IMPORTANT---\n${opts.system_prompt}\n---END IMPORTANT---`;
      functionCallRequest.messages.unshift({role: 'system', content: opts.system_prompt});
    }

    // Use SmartChatModel to get replacement values
    const chatModel = new SmartChatModel(this.main.env, this.chat_model_platform_key, this.model_config);
    if(this.request_adapter) chatModel._request_adapter = this.request_adapter;
    const replacementValues = await chatModel.complete(functionCallRequest);
    Object.entries(replacementValues).forEach(([key, value]) => {
      if(typeof value !== 'string' && typeof value !== 'number') {
        console.warn(`Replacement value is not a string or number: `, JSON.stringify(value, null, 2));
        if(Array.isArray(value)) {
          replacementValues[key] = value.join('\n');
        } else {
          replacementValues[key] = value ? JSON.stringify(value) : '';
        }
      }
    });

    // Merge replacement values into context
    Object.assign(mergedContext, replacementValues);

    return ejs.render(template_content, mergedContext);
  }
  get model_config() {
    if(this.main.settings.smart_templates_plugin?.[this.chat_model_platform_key]) return this.main.settings.smart_templates_plugin[this.chat_model_platform_key];
    if(this.main.settings?.[this.chat_model_platform_key]) return this.main.settings[this.chat_model_platform_key];
    return {api_key: this.api_key};
  }
  get chat_model_platform_key() {
    if(this.main.settings.smart_templates_plugin?.chat_model_platform_key) return this.main.settings.smart_templates_plugin.chat_model_platform_key;
    if(this.main.settings?.smart_templates?.chat_model_platform_key) return this.main.settings.smart_templates.chat_model_platform_key;
    return this.main.settings?.chat_model_platform_key || 'openai';
  }
  add_template(path) {
    const file_name = path.split('/').pop().split('.').shift();
    this._templates[file_name] = path;
  }
  get templates() {
    return Object.keys(this._templates);
  }
}
