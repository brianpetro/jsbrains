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

import ejs from 'ejs';
import { SmartChatModel } from '../smart-chat-model/smart_chat_model.js';

export class SmartTemplates {
  constructor(env = {}, opts = {}) {
    this.env = env;
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
    else throw new Error('opts.read_adapter is required (ex. fs.promises.readFile)');
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
  get settings() { return this.env.settings; }
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
  async get_template(template, file_type = null) {
    if(typeof template !== 'string') throw new Error('Template must be a string');
    if(this._templates[template]) template = this._templates[template];
    const adapter = this.get_adapter_by(file_type || template.split('.').pop());
    // console.log('adapter', adapter);
    if(typeof adapter?.get_template === 'function') return await adapter.get_template(template);
    if (!template.includes('\n') && this.file_types.includes(template.split('.').pop())) {
      template = await this.load_template(template);
    }
    // console.log('template', template);
    if (typeof adapter?.convert_to_ejs === 'function') {
      template = adapter.convert_to_ejs(template);
    }
    // console.log('template', template);
    return template;
  }

  async load_template(pointer) {
    try {
      let template = await this.read_adapter(pointer);
      // if is buffer, convert to string
      if (Buffer.isBuffer(template)) {
        template = template.toString();
      }
      return template;
    } catch (error) {
      console.error(`Error loading template from ${pointer}:`, error);
      return '';
    }
  }

  // Get variables from EJS template
  async get_variables(pointer) {
    let variables = [];
    // console.log('adapter', this.adapter);
    const file_type = pointer.split('.').pop();
    const adapter = this.get_adapter_by(file_type);
    if (adapter && typeof adapter.get_variables === 'function') {
      return await adapter.get_variables(pointer);
    }
    const template = await this.get_template(pointer);
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

  async get_function_call(template) {
    if (this.adapter && typeof this.adapter.get_function_call === 'function') {
      return this.adapter.get_function_call(template);
    }
    const variables = await this.get_variables(template);
    const properties = variables.reduce((acc, variable) => {
      acc[variable.name] = { type: 'string', description: variable.prompt || 'TODO' };
      return acc;
    }, {});
    return {
      type: "function",
      function: {
        name: "generate_content",
        description: "Generate arguments based on the CONTEXT.",
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
    const templateContent = await this.get_template(template);
    const mergedContext = { ...context, ...opts };

    const functionCallRequest = {
      messages: [
        {
          role: 'user',
          content: `---CONTEXT---\n${context}\n---END CONTEXT---`,
        }
      ],
      tools: [
        await this.get_function_call(template)
      ],
      tool_choice: {
        type: 'function',
        function: {
          name: 'generate_content'
        }
      },
      stream: false
    };
    // console.log(functionCallRequest);

    // Use SmartChatModel to get replacement values
    const chatModel = new SmartChatModel(this.env, this.chat_model_platform_key, this.model_config);
    if(this.request_adapter) chatModel._request_adapter = this.request_adapter;
    const replacementValues = await chatModel.complete(functionCallRequest);
    // console.log(replacementValues);

    // Merge replacement values into context
    Object.assign(mergedContext, replacementValues);

    return ejs.render(templateContent, mergedContext);
  }
  get model_config() {
    if(this.env.smart_templates_plugin?.settings?.[this.chat_model_platform_key]) return this.env.smart_templates_plugin.settings[this.chat_model_platform_key];
    if(this.env.settings?.[this.chat_model_platform_key]) return this.env.settings[this.chat_model_platform_key];
    return {api_key: this.api_key};
  }
  get chat_model_platform_key() { return this.env.settings?.smart_templates?.chat_model_platform_key || this.env.settings?.chat_model_platform_key || 'openai'; }
  add_template(path) {
    const file_name = path.split('/').pop().split('.').shift();
    this._templates[file_name] = path;
  }
  get templates() {
    return Object.keys(this._templates);
  }
}
