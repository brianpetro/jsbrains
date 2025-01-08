// File: smart-templates-2/adapters/tool_json.js

import { TemplateSourceAdapter } from "./_adapter.js";

/**
 * @class ToolJsonTemplateAdapter
 * @extends TemplateSourceAdapter
 * @description Adapter for specialized `.tool.json` files containing tool definitions
 * (OpenAI function format) plus optional fields like var_prompts, prompt, opts, output, etc.
 */
export class ToolJsonTemplateAdapter extends TemplateSourceAdapter {
  static extension = 'tool.json';
  extension = 'tool.json';

  /**
   * @async
   * @method import
   * @description Reads the `.tool.json` file and converts it to the standard template format
   * @returns {Promise<Object>} The parsed and converted template data
   */
  async import() {
    const raw = await this.read();
    const parsed = JSON.parse(raw);

    // Initialize data structure if needed
    if (!this.item.data.var_prompts) this.item.data.var_prompts = {};
    if (!this.item.data.opts) this.item.data.opts = {};

    // Handle tool function parameters conversion
    if (parsed.tool?.function?.parameters?.properties) {
      const props = parsed.tool.function.parameters.properties;
      
      // Convert nested object parameters to multiple_output format
      for (const [key, value] of Object.entries(props)) {
        if (value.type === 'object' && value.properties) {
          // Store the original description in var_prompts
          if (value.description) {
            this.item.data.var_prompts[key] = value.description;
          }

          // Set up multiple_output options
          if (!this.item.data.opts.multiple_output) {
            this.item.data.opts.multiple_output = [];
          }
          if (!this.item.data.opts.multiple_output.includes(key)) {
            this.item.data.opts.multiple_output.push(key);
          }

          // Count the number of required outputs
          const numOutputs = Object.keys(value.properties).length;
          this.item.data.opts.multiple_output_count = numOutputs;

        }
      }
    }

    // Copy over the function description as the prompt
    if (parsed.tool?.function?.description) {
      this.item.data.prompt = parsed.tool.function.description;
    }

    // Copy the name
    if (parsed.name) {
      this.item.data.name = parsed.name;
    }

    return this.item.data;
  }

  /**
   * @async
   * @method export
   * @description Converts the standard template format back to tool.json format
   * @returns {Promise<string>} The stringified tool.json content
   */
  async export() {
    const data = this.item.data;
    const toolJson = {
      name: data.name,
      tool: {
        type: "function",
        function: {
          name: data.name,
          description: data.prompt,
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      output: data.output || {},
      opts: { ...data.opts }
    };

    // Convert multiple_output format back to nested object parameters
    if (data.opts?.multiple_output) {
      for (const key of data.opts.multiple_output) {
        const numOutputs = data.opts.multiple_output_count || 3;
        const properties = {};
        
        // Create numbered properties
        for (let i = 1; i <= numOutputs; i++) {
          properties[i] = { type: "string" };
        }

        toolJson.tool.function.parameters.properties[key] = {
          type: "object",
          description: data.var_prompts[key],
          properties: properties,
          required: Object.keys(properties)
        };

        toolJson.tool.function.parameters.required.push(key);
      }
    }

    return JSON.stringify(toolJson, null, 2);
  }
}

export default {
  item: ToolJsonTemplateAdapter
};
