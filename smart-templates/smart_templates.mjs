import ejs from 'ejs';
import fs from 'fs';
import { SmartChatModel } from './smart-chat-model/smart_chat_model.js';
import dotenv from 'dotenv';

dotenv.config();

export class SmartTemplates {
  constructor(env = {}, adapter = null) {
    this.env = env;
    this.adapter = adapter;
  }
  get settings() { return this.env.settings; }
  get var_prompts() { return this.settings.smart_templates?.var_prompts || {}; }
  get api_key() { return this.settings.smart_templates?.api_key || process.env.OPENAI_API_KEY; }

  // EJS template base syntax engine
  get_template(pointer) {
    if (this.adapter && typeof this.adapter.get_template === 'function') {
      return this.adapter.get_template(pointer);
    }
    if (typeof pointer === 'string' && pointer.trim().endsWith('.ejs')) {
      return this.load_template(pointer);
    }
    return pointer;
  }

  load_template(pointer) {
    try {
      return fs.readFileSync(pointer, 'utf8');
    } catch (error) {
      console.error(`Error loading template from ${pointer}:`, error);
      return '';
    }
  }

  // Get variables from EJS template
  get_variables(pointer) {
    if (this.adapter && typeof this.adapter.get_variables === 'function') {
      return this.adapter.get_variables(pointer);
    }
    const template = this.get_template(pointer);
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

  get_function_call(pointer) {
    if (this.adapter && typeof this.adapter.get_function_call === 'function') {
      return this.adapter.get_function_call(pointer);
    }
    const variables = this.get_variables(pointer);
    const properties = variables.reduce((acc, variable) => {
      acc[variable.name] = { type: 'string', description: variable.prompt || 'TODO' };
      return acc;
    }, {});
    return {
      type: "function",
      function: {
        name: "generate_content",
        description: "Generate content based on the user's input",
        parameters: {
          type: "object",
          properties,
          required: variables.map(variable => variable.name)
        }
      }
    };
  }

  // Get view data using the function call output
  get_view_data(output) {
    if (this.adapter && typeof this.adapter.get_view_data === 'function') {
      return this.adapter.get_view_data(output);
    }
    return output;
  }

  // Render template with context and options
  async render(template, context, opts = {}) {
    const templateContent = this.get_template(template);
    const mergedContext = { ...context, ...opts };

    const functionCallRequest = {
      messages: [
        {
          role: 'user',
          content: JSON.stringify(context)
        }
      ],
      tools: [
        this.get_function_call(template)
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
    const chatModel = new SmartChatModel(this.env, 'openai', {
      api_key: this.api_key,
    });
    const replacementValues = await chatModel.complete(functionCallRequest);
    console.log(replacementValues);

    // Merge replacement values into context
    Object.assign(mergedContext, replacementValues);

    return ejs.render(templateContent, mergedContext);
  }
}
