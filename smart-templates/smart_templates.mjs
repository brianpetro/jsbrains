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
import fs from 'fs';
import { SmartChatModel } from '../smart-chat-model/smart_chat_model.js';
import dotenv from 'dotenv';

dotenv.config();

export class SmartTemplates {
  constructor(env = {}, opts = {}) {
    this.env = env;
    this.opts = opts;
    this.adapter = opts.adapter || null;
    this.read_adapter = opts.read_adapter || fs.promises.readFile;
  }
  get request_adapter() { return this.opts.request_adapter || null; }
  get settings() { return this.env.settings; }
  get var_prompts() { return this.settings.smart_templates?.var_prompts || {}; }
  get api_key() { return this.settings.smart_templates?.api_key || process.env.OPENAI_API_KEY; }
  get file_types() {
    return [
      ...(this.adapter ? this.adapter.file_types : []),
      'ejs',
    ];
  }

  // EJS template base syntax engine
  async get_template(template) {
    if(typeof this.adapter?.get_template === 'function') return this.adapter.get_template(template);
    if(typeof template !== 'string') throw new Error('Template must be a string');
    if (!template.includes('\n') && this.file_types.includes(template.split('.').pop())) {
      template = await this.load_template(template);
    }
    if (this.adapter && typeof this.adapter.convert_to_ejs === 'function') {
      template = this.adapter.convert_to_ejs(template);
    }
    return template;
  }

  async load_template(pointer) {
    try {
      return await this.read_adapter(pointer);
    } catch (error) {
      console.error(`Error loading template from ${pointer}:`, error);
      return '';
    }
  }

  // Get variables from EJS template
  async get_variables(pointer) {
    if (this.adapter && typeof this.adapter.get_variables === 'function') {
      return this.adapter.get_variables(pointer);
    }
    const template = await this.get_template(pointer);
    const regex = /<%[-_=]?\s*=?\s*([\w.]+(\[\w+])?)\s*[-_]?%>/g;
    const variables = [];
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
        description: "Generate content based on the CONTEXT.",
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
    console.log(functionCallRequest);

    // Use SmartChatModel to get replacement values
    const chatModel = new SmartChatModel(this.env, this.chat_model_platform_key, this.model_config);
    if(this.request_adapter) chatModel._request_adapter = this.request_adapter;
    const replacementValues = await chatModel.complete(functionCallRequest);
    console.log(replacementValues);

    // Merge replacement values into context
    Object.assign(mergedContext, replacementValues);

    return ejs.render(templateContent, mergedContext);
  }
  get model_config() { return this.env.settings?.smart_templates?.model_config || {api_key: this.api_key}; }
  get chat_model_platform_key() { return this.env.settings?.smart_templates?.chat_model_platform_key || this.env.settings?.chat_model_platform_key || 'openai'; }
}
