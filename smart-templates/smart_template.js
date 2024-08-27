import { SmartSource } from '../smart-sources/smart_source.js';
import ejs from './ejs.min.cjs';
import { SmartChatModel } from 'smart-chat-model';

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

  get template_adapter() {
    if (!this._template_adapter) {
      const AdapterClass = this.collection.template_adapters[this.file_type] || this.env.smart_templates.template_adapters.default;
      this._template_adapter = new AdapterClass(this);
    }
    return this._template_adapter;
  }

  async parse_variables() {
    if (!this._parsed_variables) {
      this._parsed_variables = await this.template_adapter.parse_variables();
      
      // Add variables to SmartTemplates _variables object
      if (!this.env.smart_templates._variables) {
        this.env.smart_templates._variables = {};
      }
      this._parsed_variables.forEach(variable => {
        if (!variable.inline) {
          this.env.smart_templates._variables[variable.name] = variable;
        }
      });
    }
    return this._parsed_variables;
  }

  async get_chatml_tools(opts = {}) {
    const variables = await this.parse_variables();
    const properties = variables.reduce((acc, variable) => {
      acc[variable.name] = { 
        type: 'string', 
        description: variable.prompt || `Value for ${variable.name}`
      };
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
    return {template: await this.read(), template_opts: {}};
  }

  async render(render_opts) {
    const { template, template_opts } = await this.get_template();
    const { 
      context, 
      file_path, 
      to_key, 
      output_mode = this.env.smart_templates.default_output_mode, 
      include_connections = 0,
      system_prompt
    } = {
      ...template_opts,
      ...render_opts,
    };
    
    try {
      
      let merged_context = { ...context };
      
      if (include_connections > 0) {
        const connections = await this.find_connections({ limit: include_connections });
        merged_context.connections = connections;
      }

      const chat_model = new SmartChatModel(
        this.env, 
        this.collection.chat_model_platform_key, 
        this.collection.model_config
      );

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

      const generated_content = await chat_model.complete(function_call_request);

      Object.entries(generated_content).forEach(([key, value]) => {
        if (typeof value !== 'string' && typeof value !== 'number') {
          console.warn(`Replacement value is not a string or number: `, JSON.stringify(value, null, 2));
          if (Array.isArray(value)) {
            generated_content[key] = value.join('\n');
          } else {
            generated_content[key] = value ? JSON.stringify(value) : '';
          }
        }
      });

      Object.assign(merged_context, generated_content);

      const converted_template = this.template_adapter.convert_to_ejs(template);
      const rendered_content = ejs.render(converted_template, merged_context);

      if (rendered_content.length > this.env.smart_templates.max_content_length) {
        throw new Error(`Rendered content exceeds maximum length of ${this.env.smart_templates.max_content_length} characters`);
      }

      const target_source = this.env.smart_sources?.get(to_key || file_path);
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
    } catch (error) {
      console.log(`Error rendering template ${this.key}:`, error);
      throw error;
    }
  }
}