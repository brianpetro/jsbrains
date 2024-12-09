import { SmartBlock } from "smart-sources";

/**
 * @class SmartTemplateOutput
 * @extends SmartBlock
 * @description Handles individual template output operations and hypothetical processing
 */
export class SmartTemplateOutput extends SmartBlock {
  /**
   * @async
   * @param {Object} params - Parameters for the lookup operation
   * @returns {Promise<Object>} Results from the smart sources lookup
   * @description Performs a lookup operation using hypotheticals
   */
  async lookup(params = {}) {
    const results = this.env.smart_sources.lookup({
      hypotheticals: this.hypotheticals,
    });
    return results;
  }

  /**
   * @returns {SmartTemplate} The template associated with this output
   * @description Gets the template instance from the collection using the template key
   */
  get template() {
    return this.collection.items[this.data.template_key];
  }

  /**
   * @returns {Array<string>} Array of processed hypothetical values
   * @description Processes and extracts hypothetical values from the template response
   */
  get hypotheticals() {
    const hypotheticals_map = Object.values(this.template.data.opts.lookup_hypotheticals_map)
      .map(json_path => json_path.split('.'))
    ;
    const output_args = typeof this.data.response.tool_calls[0].function.arguments === 'string'
      ? JSON.parse(this.data.response.tool_calls[0].function.arguments)
      : this.data.response.tool_calls[0].function.arguments
    ;
    const hypotheticals = hypotheticals_map.map(json_path => {
      let value = output_args;
      for (const key of json_path) {
        value = value[key];
      }
      return value;
    });
    return hypotheticals;
  }
}