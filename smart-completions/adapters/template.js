/**
 * 
 * 
 * 
 * @deprecated moved to smart-templates-obsidian TemplateCompletionAdapter
 * 
 * 
 * 
 * 
 */

import { SmartCompletionAdapter } from './_adapter.js';

/**
 * @class SmartCompletionTemplateAdapter
 * @deprecated moved to smart-templates-obsidian TemplateCompletionAdapter
 * @extends SmartCompletionAdapter
 *
 * This adapter checks `item.data.template`, looks for a matching SmartTemplate item
 * in `env.smart_templates`, and may add tool configuration to `completion.request`.
 */
export class SmartCompletionTemplateAdapter extends SmartCompletionAdapter {
  /**
   * @returns {string}
   */
  static get property_name() {
    return 'template_key';
  }


  /**
   * to_request: Locates the template item, injects relevant fields into request.
   * @returns {Promise<void>}
   */
  async to_request() {
    const template_key = this.data.template_key;
    if(!template_key) return;

    const template_collection = this.item.env.smart_templates;
    if(!template_collection) {
      console.warn("No 'smart_templates' collection found; skipping template adapter.");
      return;
    }
    const template_item = template_collection.get(template_key);
    if(!template_item) {
      console.warn(`Template item not found for key '${template_key}'`);
      return;
    }

    const template_content = await template_item.get_template();
    const template_templates = this.data.template_templates;
    const system_prompt = compile_template_instructions(template_content, template_templates);
    this.insert_user_message(system_prompt);

  }


  /**
   * from_response: No post-processing needed for this template usage.
   * @returns {Promise<void>}
   */
  async from_response() {}
}

/**
 * compile_system_prompt: Compiles the system prompt for the template.
 * @param {SmartTemplate} template_item
 * @returns {string}
 */
function compile_template_instructions(template_text, template_templates = {}) {
  if(!template_templates.before) template_templates.before = `Important: use the following template to format your response:
- should output exact headings
- should interpret non-heading template text as instructions
  - each non-heading template text should be considered specific to the respective heading
  
---BEGIN TEMPLATE---`;
  if(!template_templates.after) template_templates.after = `---END TEMPLATE---`;
  return `${template_templates.before}
${template_text}
${template_templates.after}`;
}